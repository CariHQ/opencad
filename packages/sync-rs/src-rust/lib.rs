/// OpenCAD Sync WASM — Last-Write-Wins CRDT for document elements.
///
/// Each element in the document map is a LWW register: updates carry a
/// Lamport timestamp + peer ID, and the register keeps whichever write has
/// the higher (lamport, peer_id) tuple.  Merging two replicas is O(n) in the
/// number of elements — no O(n²) path-conflict scan.

use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};

// ── LWW entry ─────────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize)]
struct LwwEntry {
    value: serde_json::Value,
    lamport: u64,
    peer_id: String,
}

// ── Delta (single-element broadcast) ─────────────────────────────────────────

#[derive(Serialize, Deserialize)]
struct Delta {
    element_id: String,
    entry: LwwEntry,
}

// ── DocumentCrdt ──────────────────────────────────────────────────────────────

#[wasm_bindgen]
pub struct DocumentCrdt {
    peer_id: String,
    lamport: u64,
    entries: HashMap<String, LwwEntry>,
    vector_clock: HashMap<String, u64>,
}

#[wasm_bindgen]
impl DocumentCrdt {
    #[wasm_bindgen(constructor)]
    pub fn new(peer_id: &str) -> DocumentCrdt {
        DocumentCrdt {
            peer_id: peer_id.to_string(),
            lamport: 0,
            entries: HashMap::new(),
            vector_clock: HashMap::new(),
        }
    }

    /// Apply a local update. Returns a JSON delta string to broadcast to peers.
    pub fn apply_local(&mut self, element_id: &str, value_json: &str) -> String {
        self.lamport += 1;
        *self.vector_clock.entry(self.peer_id.clone()).or_insert(0) += 1;

        let value = serde_json::from_str(value_json).unwrap_or(serde_json::Value::Null);
        let entry = LwwEntry {
            value,
            lamport: self.lamport,
            peer_id: self.peer_id.clone(),
        };
        self.entries.insert(element_id.to_string(), entry.clone());

        let delta = Delta { element_id: element_id.to_string(), entry };
        serde_json::to_string(&delta).unwrap_or_default()
    }

    /// Merge a remote delta received from another peer.
    pub fn merge_remote(&mut self, delta_json: &str) {
        let delta: Delta = match serde_json::from_str(delta_json) {
            Ok(d) => d,
            Err(_) => return,
        };

        // Advance Lamport clock
        if delta.entry.lamport >= self.lamport {
            self.lamport = delta.entry.lamport + 1;
        }

        // Track remote peer's clock
        let remote = self.vector_clock.entry(delta.entry.peer_id.clone()).or_insert(0);
        if delta.entry.lamport > *remote {
            *remote = delta.entry.lamport;
        }

        // LWW: keep higher (lamport, peer_id) — deterministic tiebreak
        let should_apply = match self.entries.get(&delta.element_id) {
            None => true,
            Some(existing) => {
                delta.entry.lamport > existing.lamport
                    || (delta.entry.lamport == existing.lamport
                        && delta.entry.peer_id > existing.peer_id)
            }
        };

        if should_apply {
            self.entries.insert(delta.element_id, delta.entry);
        }
    }

    /// Current document state as JSON: `{ elementId: value, ... }`
    pub fn state_json(&self) -> String {
        let state: HashMap<&str, &serde_json::Value> =
            self.entries.iter().map(|(k, v)| (k.as_str(), &v.value)).collect();
        serde_json::to_string(&state).unwrap_or_default()
    }

    /// Vector clock as JSON: `{ peerId: lamportClock, ... }`
    pub fn vector_clock(&self) -> String {
        serde_json::to_string(&self.vector_clock).unwrap_or_default()
    }

    pub fn element_count(&self) -> usize {
        self.entries.len()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn t_col_rs_001_concurrent_updates_converge() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        let da = a.apply_local("elem1", r#"{"x":0}"#);
        let db = b.apply_local("elem1", r#"{"x":100}"#);

        a.merge_remote(&db);
        b.merge_remote(&da);

        assert_eq!(a.state_json(), b.state_json(), "Both peers must converge");
    }

    #[test]
    fn t_col_rs_002_non_conflicting_updates_both_preserved() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        let da = a.apply_local("wall1", r#"{"type":"wall"}"#);
        let db = b.apply_local("wall2", r#"{"type":"wall"}"#);

        a.merge_remote(&db);
        b.merge_remote(&da);

        let state: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        assert!(state.get("wall1").is_some(), "wall1 must be in peer_a");
        assert!(state.get("wall2").is_some(), "wall2 must be in peer_a");
        assert_eq!(a.element_count(), 2);
        assert_eq!(b.element_count(), 2);
    }

    #[test]
    fn t_col_rs_003_higher_lamport_wins_conflict() {
        let mut a = DocumentCrdt::new("a");
        let mut b = DocumentCrdt::new("b");

        // b makes two updates — its lamport=2 beats a's lamport=1
        b.apply_local("elem1", r#"{"x":1}"#);
        let db = b.apply_local("elem1", r#"{"x":999}"#);
        let da = a.apply_local("elem1", r#"{"x":0}"#);

        a.merge_remote(&db);
        b.merge_remote(&da);

        let sa: serde_json::Value = serde_json::from_str(&a.state_json()).unwrap();
        let sb: serde_json::Value = serde_json::from_str(&b.state_json()).unwrap();
        assert_eq!(sa["elem1"]["x"], 999, "peer_a should have x=999");
        assert_eq!(sb["elem1"]["x"], 999, "peer_b should have x=999");
    }

    #[test]
    fn t_col_rs_004_merge_is_idempotent() {
        let mut a = DocumentCrdt::new("a");
        let delta = a.apply_local("elem1", r#"{"x":42}"#);

        let mut b = DocumentCrdt::new("b");
        b.merge_remote(&delta);
        let s1 = b.state_json();
        b.merge_remote(&delta);
        let s2 = b.state_json();
        b.merge_remote(&delta);
        let s3 = b.state_json();

        assert_eq!(s1, s2);
        assert_eq!(s2, s3);
    }

    #[test]
    fn t_col_rs_005_vector_clock_advances() {
        let mut peer = DocumentCrdt::new("alice");
        peer.apply_local("e1", "{}");
        peer.apply_local("e2", "{}");
        peer.apply_local("e3", "{}");

        let vc: serde_json::Value = serde_json::from_str(&peer.vector_clock()).unwrap();
        assert_eq!(vc["alice"], 3, "alice clock should be 3 after 3 updates");
    }
}
