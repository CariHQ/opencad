use std::{path::PathBuf, sync::Arc};

use anyhow::{Context, Result};
use async_trait::async_trait;
use bytes::Bytes;
use futures_util::TryStreamExt;
use object_store::{path::Path as OsPath, ObjectStore};

use crate::config::{Config, StorageBackend};

// ── Trait ─────────────────────────────────────────────────────────────────────

#[async_trait]
pub trait Storage: Send + Sync + 'static {
    async fn put(&self, key: &str, data: Bytes) -> Result<()>;
    async fn get(&self, key: &str) -> Result<Bytes>;
    async fn delete(&self, key: &str) -> Result<()>;
    /// List all keys with the given prefix.
    async fn list(&self, prefix: &str) -> Result<Vec<String>>;
    async fn exists(&self, key: &str) -> Result<bool>;
}

/// Build the storage backend from config.
pub fn init(cfg: &Config) -> Result<Arc<dyn Storage>> {
    match cfg.storage_backend {
        StorageBackend::Local => {
            std::fs::create_dir_all(&cfg.storage_path)?;
            Ok(Arc::new(LocalStorage::new(&cfg.storage_path)))
        }
        StorageBackend::Gcs => {
            let bucket = cfg.gcs_bucket.as_deref().unwrap(); // validated in Config::from_env
            let store = object_store::gcp::GoogleCloudStorageBuilder::new()
                .with_bucket_name(bucket)
                .build()
                .context("failed to build GCS client")?;
            Ok(Arc::new(GcsStorage {
                store: Arc::new(store),
            }))
        }
    }
}

// ── Google Cloud Storage backend ──────────────────────────────────────────────

struct GcsStorage {
    store: Arc<dyn ObjectStore>,
}

#[async_trait]
impl Storage for GcsStorage {
    async fn put(&self, key: &str, data: Bytes) -> Result<()> {
        let path = OsPath::from(key);
        self.store.put(&path, data.into()).await?;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Bytes> {
        let path = OsPath::from(key);
        let result = self.store.get(&path).await?;
        Ok(result.bytes().await?)
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let path = OsPath::from(key);
        self.store.delete(&path).await?;
        Ok(())
    }

    async fn list(&self, prefix: &str) -> Result<Vec<String>> {
        let prefix = OsPath::from(prefix);
        let keys: Vec<String> = self
            .store
            .list(Some(&prefix))
            .map_ok(|meta| meta.location.to_string())
            .try_collect()
            .await?;
        Ok(keys)
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        let path = OsPath::from(key);
        match self.store.head(&path).await {
            Ok(_) => Ok(true),
            Err(object_store::Error::NotFound { .. }) => Ok(false),
            Err(e) => Err(e.into()),
        }
    }
}

// ── Local filesystem backend ──────────────────────────────────────────────────

pub struct LocalStorage {
    root: PathBuf,
}

impl LocalStorage {
    pub fn new(path: &str) -> Self {
        Self {
            root: PathBuf::from(path),
        }
    }

    fn full_path(&self, key: &str) -> PathBuf {
        // Strip leading slashes and collapse any ".." components.
        let safe = key.trim_start_matches('/').replace("..", "__");
        self.root.join(safe)
    }
}

#[async_trait]
impl Storage for LocalStorage {
    async fn put(&self, key: &str, data: Bytes) -> Result<()> {
        let path = self.full_path(key);
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        tokio::fs::write(path, data).await?;
        Ok(())
    }

    async fn get(&self, key: &str) -> Result<Bytes> {
        let data = tokio::fs::read(self.full_path(key)).await?;
        Ok(Bytes::from(data))
    }

    async fn delete(&self, key: &str) -> Result<()> {
        let path = self.full_path(key);
        if path.exists() {
            tokio::fs::remove_file(path).await?;
        }
        Ok(())
    }

    async fn list(&self, prefix: &str) -> Result<Vec<String>> {
        let dir = self.full_path(prefix);
        if !dir.exists() {
            return Ok(vec![]);
        }
        let mut entries = tokio::fs::read_dir(&dir).await?;
        let mut keys = Vec::new();
        while let Some(entry) = entries.next_entry().await? {
            if let Ok(name) = entry.file_name().into_string() {
                keys.push(format!("{}/{}", prefix.trim_end_matches('/'), name));
            }
        }
        Ok(keys)
    }

    async fn exists(&self, key: &str) -> Result<bool> {
        Ok(self.full_path(key).exists())
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn make_store() -> (LocalStorage, TempDir) {
        let dir = TempDir::new().unwrap();
        let s = LocalStorage::new(dir.path().to_str().unwrap());
        (s, dir)
    }

    #[tokio::test]
    async fn put_and_get_roundtrip() {
        let (store, _dir) = make_store();
        store.put("hello.txt", Bytes::from("world")).await.unwrap();
        let got = store.get("hello.txt").await.unwrap();
        assert_eq!(got, Bytes::from("world"));
    }

    #[tokio::test]
    async fn exists_returns_true_after_put() {
        let (store, _dir) = make_store();
        assert!(!store.exists("x.bin").await.unwrap());
        store.put("x.bin", Bytes::from(&b"\x00"[..])).await.unwrap();
        assert!(store.exists("x.bin").await.unwrap());
    }

    #[tokio::test]
    async fn delete_removes_file() {
        let (store, _dir) = make_store();
        store.put("del.txt", Bytes::from("bye")).await.unwrap();
        store.delete("del.txt").await.unwrap();
        assert!(!store.exists("del.txt").await.unwrap());
    }

    #[tokio::test]
    async fn list_returns_keys_under_prefix() {
        let (store, _dir) = make_store();
        store.put("proj/a.ifc", Bytes::from("a")).await.unwrap();
        store.put("proj/b.ifc", Bytes::from("b")).await.unwrap();
        let mut keys = store.list("proj").await.unwrap();
        keys.sort();
        assert_eq!(keys, vec!["proj/a.ifc", "proj/b.ifc"]);
    }

    #[tokio::test]
    async fn path_traversal_is_blocked() {
        let (store, _dir) = make_store();
        // Should not escape the root
        store.put("../../etc/passwd", Bytes::from("x")).await.unwrap();
        let path = store.full_path("../../etc/passwd");
        assert!(path.starts_with(&store.root));
    }
}
