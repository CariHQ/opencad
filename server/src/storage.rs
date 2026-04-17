use std::{path::PathBuf, sync::Arc};

use anyhow::Result;
use async_trait::async_trait;
use bytes::Bytes;

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
            // Wired up when we deploy to Cloud Run — swap in object_store::gcp.
            anyhow::bail!(
                "GCS storage backend is not yet implemented; \
                 set STORAGE_BACKEND=local for local development"
            );
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
