//! Shared first-party token scanner. Assemble logical text before scanning;
//! arbitrary provider secrets and encodings are outside this shape contract.

pub const TOKEN_PREFIXES: &[&str] = &["hnry_session_", "hnry_activity_", "hnry_lifecycle_", "hnry_plugin_"];
pub const REDACTED: &str = "hnry_session_<redacted>";

pub fn text(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out: Option<String> = None;
    let mut copied = 0;
    let mut i = 0;
    while i < bytes.len() {
        if let Some(prefix) = TOKEN_PREFIXES.iter().find(|prefix| {
            bytes
                .get(i..i + prefix.len())
                .is_some_and(|s| s.eq_ignore_ascii_case(prefix.as_bytes()))
        }) {
            let digits = bytes[i + prefix.len()..]
                .iter()
                .take_while(|b| b.is_ascii_hexdigit())
                .count();
            if digits >= 8 {
                let end = i + prefix.len() + digits;
                let buffer = out.get_or_insert_with(|| String::with_capacity(text.len()));
                buffer.push_str(&text[copied..i]);
                buffer.push_str(prefix);
                buffer.push_str("<redacted>");
                copied = end;
                i = end;
                continue;
            }
        }
        i += 1;
    }
    out.map(|mut buffer| {
        buffer.push_str(&text[copied..]);
        buffer
    })
}

pub fn value(value: &mut serde_json::Value) -> bool {
    use serde_json::Value;
    match value {
        Value::String(s) => {
            if let Some(redacted) = text(s) {
                *s = redacted;
                true
            } else {
                false
            }
        }
        Value::Array(items) => {
            let mut changed = false;
            for item in items {
                changed |= self::value(item);
            }
            changed
        }
        Value::Object(map) => {
            let mut changed = false;
            let keys: Vec<_> = map
                .keys()
                .filter_map(|key| text(key).map(|r| (key.clone(), r)))
                .collect();
            for (key, replacement) in keys {
                if let Some(mut entry) = map.remove(&key) {
                    self::value(&mut entry);
                    map.insert(replacement, entry);
                    changed = true;
                }
            }
            for entry in map.values_mut() {
                changed |= self::value(entry);
            }
            changed
        }
        _ => false,
    }
}

pub struct Assembly {
    text: String,
    cap: usize,
    truncated: bool,
}
pub struct Assembled {
    pub text: String,
    pub truncated: bool,
}

impl Assembly {
    pub fn new(cap: usize) -> Self {
        Self {
            text: String::new(),
            cap,
            truncated: false,
        }
    }
    pub fn push(&mut self, chunk: &str) {
        let remaining = self.cap.saturating_sub(self.text.len());
        let mut end = remaining.min(chunk.len());
        while !chunk.is_char_boundary(end) {
            end -= 1;
        }
        self.text.push_str(&chunk[..end]);
        self.truncated |= end < chunk.len();
    }
    pub fn finish(mut self, cap: usize) -> Assembled {
        // At an assembly cap the last run may be only part of a prefix or
        // secret. Drop it conservatively, even below the scanner's threshold.
        if self.truncated {
            let lower = self.text.to_ascii_lowercase();
            for i in 0..lower.len() {
                if !self.text.is_char_boundary(i) {
                    continue;
                }
                let tail = &lower[i..];
                if TOKEN_PREFIXES
                    .iter()
                    .any(|p| p.starts_with(tail) || tail.starts_with(p))
                {
                    self.text.truncate(i);
                    break;
                }
            }
        }
        let mut text = text(&self.text).unwrap_or(self.text);
        if text.len() > cap {
            let mut end = cap;
            while !text.is_char_boundary(end) {
                end -= 1;
            }
            text.truncate(end);
            self.truncated = true;
        }
        Assembled {
            text,
            truncated: self.truncated,
        }
    }
}
