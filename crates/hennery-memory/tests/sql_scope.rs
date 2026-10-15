/// Every string literal in `source`, in order, skipping comments and char
/// literals. Enough of Rust's lexer for these files: plain and raw
/// strings, the common escapes and line continuations.
fn string_literals(source: &str) -> Vec<String> {
    let s: Vec<char> = source.chars().collect();
    let mut out = Vec::new();
    let mut i = 0;
    while i < s.len() {
        let rest = &s[i..];
        if rest.starts_with(&['/', '/']) {
            while i < s.len() && s[i] != '\n' {
                i += 1;
            }
        } else if rest.starts_with(&['/', '*']) {
            i += 2;
            while i + 1 < s.len() && !(s[i] == '*' && s[i + 1] == '/') {
                i += 1;
            }
            i += 2;
        } else if s[i] == 'r'
            && matches!(s.get(i + 1), Some('"' | '#'))
            && (i == 0 || !(s[i - 1].is_alphanumeric() || s[i - 1] == '_'))
        {
            let mut hashes = 0;
            i += 1;
            while s[i] == '#' {
                hashes += 1;
                i += 1;
            }
            i += 1;
            let mut lit = String::new();
            loop {
                if s[i] == '"' && s[i + 1..].iter().take(hashes).filter(|c| **c == '#').count() == hashes {
                    i += 1 + hashes;
                    break;
                }
                lit.push(s[i]);
                i += 1;
            }
            out.push(lit);
        } else if s[i] == '"' {
            i += 1;
            let mut lit = String::new();
            while s[i] != '"' {
                if s[i] == '\\' {
                    i += 1;
                    match s[i] {
                        'n' => lit.push('\n'),
                        't' => lit.push('\t'),
                        '\n' => {
                            while s[i + 1].is_whitespace() {
                                i += 1;
                            }
                        }
                        c => lit.push(c),
                    }
                } else {
                    lit.push(s[i]);
                }
                i += 1;
            }
            i += 1;
            out.push(lit);
        } else if s[i] == '\'' {
            // A char literal ('x', '\n', '"'), or a lifetime ('a).
            if s.get(i + 1) == Some(&'\\') {
                i += 2;
                while s[i] != '\'' {
                    i += 1;
                }
                i += 1;
            } else if s.get(i + 2) == Some(&'\'') {
                i += 3;
            } else {
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    out
}

#[test]
fn every_memory_statement_prepares_and_scopes_before_data_access() {
    let db = rusqlite::Connection::open_in_memory().unwrap();
    db.execute_batch(include_str!("../src/schema.sql")).unwrap();
    let source = include_str!("../src/store.rs");
    let fragments = string_literals(source);
    let coverage = fragments
        .iter()
        .find(|s| s.starts_with("CASE WHEN "))
        .expect("actual coverage SQL")
        .replace("{}", "6");
    let mut count = 0;
    for sql in string_literals(source).into_iter().filter(|s| {
        ["SELECT ", "INSERT ", "DELETE ", "UPDATE "]
            .iter()
            .any(|v| s.starts_with(v))
    }) {
        count += 1;
        let sql = sql
            .replace("{column}", "tool_hash")
            .replace("{coverage}", &coverage)
            .replace("{}", "0");
        db.prepare(&sql).unwrap_or_else(|e| panic!("{sql}: {e}"));
        let compact = sql.split_whitespace().collect::<String>();
        if sql.starts_with("INSERT INTO namespaces(") {
            continue;
        } // Explicit local bootstrap, never a mounted operation.
        if sql.contains("FROM namespaces WHERE tool_hash=?1") {
            continue;
        } // Credential lookup fixes immutable namespace.
        assert!(
            compact.contains("namespace=?") || (sql.starts_with("INSERT ") && compact.contains("(namespace,")),
            "missing parameterized namespace: {sql}"
        );
        if sql.contains("entries_fts MATCH") {
            assert!(sql.contains("rowid=e.seq"), "FTS must be correlated to the scoped row");
            let plan = format!("EXPLAIN QUERY PLAN {sql}");
            let mut stmt = db.prepare(&plan).unwrap();
            let mut query = stmt.raw_query();
            let mut descriptions = Vec::new();
            while let Some(r) = query.next().unwrap() {
                descriptions.push(r.get::<_, String>(3).unwrap());
            }
            assert!(descriptions.iter().any(|s| s.contains("CORRELATED")));
            assert!(
                !descriptions.iter().any(|s| s.contains("LIST SUBQUERY")),
                "{descriptions:?}"
            );
        }
    }
    assert_eq!(count, 8, "new statements need explicit audit coverage");
}
