//! Linear syntax checks for MCP's four string formats. No lookup, network,
//! normalization or regular expressions. The evaluator charges input bytes
//! before entering these scans; schema/instance budgets bound all input sizes.

pub(super) fn validate(format: &str, value: &str) -> bool {
    if !value.is_ascii() {
        return false;
    }
    match format {
        "email" => email(value),
        "uri" => uri(value),
        "date" => date(value.as_bytes()).is_some(),
        "date-time" => date_time(value.as_bytes()),
        _ => false,
    }
}

// RFC 5321 Mailbox: dot-string or quoted local part, DNS domain or literal.
fn email(value: &str) -> bool {
    if value.len() > 254 {
        return false;
    }
    let Some((local, domain)) = value.rsplit_once('@') else {
        return false;
    };
    if local.is_empty() || local.len() > 64 || domain.is_empty() {
        return false;
    }
    let local_valid = if local.starts_with('"') {
        if !local.ends_with('"') || local.len() < 2 {
            return false;
        }
        let mut chars = local.as_bytes()[1..local.len() - 1].iter().copied();
        let mut valid = true;
        while let Some(byte) = chars.next() {
            valid &= if byte == b'\\' {
                chars.next().is_some_and(|b| (32..=126).contains(&b))
            } else {
                matches!(byte,32..=33|35..=91|93..=126)
            };
        }
        valid
    } else {
        local.split('.').all(|atom| {
            !atom.is_empty()
                && atom
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b"!#$%&'*+-/=?^_`{|}~".contains(&b))
        })
    };
    local_valid
        && if let Some(literal) = domain.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            if let Some((tag, address)) = literal.split_once(':') {
                if tag.eq_ignore_ascii_case("IPv6") {
                    address.parse::<std::net::Ipv6Addr>().is_ok()
                } else {
                    dns_label(tag) && !address.is_empty() && address.bytes().all(|b| matches!(b,33..=90|94..=126))
                }
            } else {
                let mut parts = literal.split('.');
                (0..4).all(|_| {
                    parts.next().is_some_and(|p| {
                        !p.is_empty()
                            && p.len() <= 3
                            && p.bytes().all(|b| b.is_ascii_digit())
                            && p.parse::<u16>().is_ok_and(|n| n <= 255)
                    })
                }) && parts.next().is_none()
            }
        } else {
            domain.len() <= 255 && domain.split('.').all(dns_label)
        }
}
fn dns_label(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 63
        && value.as_bytes()[0].is_ascii_alphanumeric()
        && value.as_bytes()[value.len() - 1].is_ascii_alphanumeric()
        && value.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}

fn unreserved(b: u8) -> bool {
    b.is_ascii_alphanumeric() || b"-._~".contains(&b)
}
fn sub_delim(b: u8) -> bool {
    b"!$&'()*+,;=".contains(&b)
}
fn pchar(b: u8) -> bool {
    unreserved(b) || sub_delim(b) || b == b':' || b == b'@'
}
fn component(text: &str, allowed: impl Fn(u8) -> bool) -> bool {
    let bytes = text.as_bytes();
    let mut at = 0;
    while at < bytes.len() {
        if bytes[at] == b'%' {
            if !bytes.get(at + 1).is_some_and(u8::is_ascii_hexdigit)
                || !bytes.get(at + 2).is_some_and(u8::is_ascii_hexdigit)
            {
                return false;
            }
            at += 3;
        } else {
            if !allowed(bytes[at]) {
                return false;
            }
            at += 1;
        }
    }
    true
}
// RFC 3986 URI grammar, including opaque schemes. A URI need not be a URL.
fn uri(value: &str) -> bool {
    let Some((scheme, rest)) = value.split_once(':') else {
        return false;
    };
    if !scheme.as_bytes().first().is_some_and(u8::is_ascii_alphabetic)
        || !scheme.bytes().all(|b| b.is_ascii_alphanumeric() || b"+-.".contains(&b))
    {
        return false;
    }
    let (rest, fragment) = rest.split_once('#').map_or((rest, None), |(r, f)| (r, Some(f)));
    if fragment.is_some_and(|f| !component(f, |b| pchar(b) || b"/?".contains(&b))) {
        return false;
    }
    let (hierarchy, query) = rest.split_once('?').map_or((rest, None), |(r, q)| (r, Some(q)));
    if query.is_some_and(|q| !component(q, |b| pchar(b) || b"/?".contains(&b))) {
        return false;
    }
    let path = if let Some(after_slashes) = hierarchy.strip_prefix("//") {
        let end = after_slashes.find('/').unwrap_or(after_slashes.len());
        if !authority(&after_slashes[..end]) {
            return false;
        }
        &after_slashes[end..]
    } else {
        hierarchy
    };
    component(path, |b| pchar(b) || b == b'/')
}
fn authority(value: &str) -> bool {
    let host = if let Some((user, host)) = value.rsplit_once('@') {
        if !component(user, |b| unreserved(b) || sub_delim(b) || b == b':') {
            return false;
        }
        host
    } else {
        value
    };
    let (valid_host, port) = if let Some(after) = host.strip_prefix('[') {
        let Some((ip, tail)) = after.split_once(']') else {
            return false;
        };
        let valid = if ip.starts_with(['v', 'V']) {
            ip[1..].split_once('.').is_some_and(|(version, address)| {
                !version.is_empty()
                    && version.bytes().all(|b| b.is_ascii_hexdigit())
                    && !address.is_empty()
                    && address.bytes().all(|b| unreserved(b) || sub_delim(b) || b == b':')
            })
        } else {
            ip.parse::<std::net::Ipv6Addr>().is_ok()
        };
        if tail.is_empty() {
            (valid, None)
        } else if let Some(port) = tail.strip_prefix(':') {
            (valid, Some(port))
        } else {
            return false;
        }
    } else {
        let (name, port) = host.split_once(':').map_or((host, None), |(n, p)| (n, Some(p)));
        (component(name, |b| unreserved(b) || sub_delim(b)), port)
    };
    valid_host && port.is_none_or(|p| p.bytes().all(|b| b.is_ascii_digit()))
}

fn number(bytes: &[u8]) -> Option<u16> {
    bytes.iter().try_fold(0, |n, b| {
        if b.is_ascii_digit() {
            Some(n * 10 + u16::from(b - b'0'))
        } else {
            None
        }
    })
}
fn month_days(year: u16, month: u16) -> u16 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => 28 + u16::from(year.is_multiple_of(4) && (!year.is_multiple_of(100) || year.is_multiple_of(400))),
        _ => 0,
    }
}
fn date(bytes: &[u8]) -> Option<(u16, u16, u16)> {
    if bytes.len() != 10 || bytes[4] != b'-' || bytes[7] != b'-' {
        return None;
    }
    let year = number(&bytes[..4])?;
    let month = number(&bytes[5..7])?;
    let day = number(&bytes[8..])?;
    (day > 0 && day <= month_days(year, month)).then_some((year, month, day))
}
// RFC 3339, including lowercase t/z, mandatory zone and fractional seconds.
fn date_time(bytes: &[u8]) -> bool {
    if bytes.len() < 20 || !matches!(bytes[10], b'T' | b't') || bytes[13] != b':' || bytes[16] != b':' {
        return false;
    }
    let Some((_, month, day)) = date(&bytes[..10]) else {
        return false;
    };
    let (Some(hour), Some(minute), Some(second)) =
        (number(&bytes[11..13]), number(&bytes[14..16]), number(&bytes[17..19]))
    else {
        return false;
    };
    if hour > 23 || minute > 59 || second > 60 {
        return false;
    }
    let mut at = 19;
    if bytes[at] == b'.' {
        at += 1;
        let start = at;
        while bytes.get(at).is_some_and(u8::is_ascii_digit) {
            at += 1;
        }
        if at == start {
            return false;
        }
    }
    let zone = &bytes[at..];
    let offset = if matches!(zone, b"Z" | b"z") {
        0
    } else {
        if zone.len() != 6 || !matches!(zone[0], b'+' | b'-') || zone[3] != b':' {
            return false;
        }
        let (Some(h), Some(m)) = (number(&zone[1..3]), number(&zone[4..6])) else {
            return false;
        };
        if h > 23 || m > 59 {
            return false;
        }
        let minutes = i32::from(h) * 60 + i32::from(m);
        if zone[0] == b'-' { -minutes } else { minutes }
    };
    if second != 60 {
        return true;
    }
    let utc = i32::from(hour) * 60 + i32::from(minute) - offset;
    utc.rem_euclid(1440) == 1439
        && match utc.div_euclid(1440) {
            -1 => matches!((month, day), (1, 1) | (7, 1)),
            0 => matches!((month, day), (6, 30) | (12, 31)),
            _ => false,
        }
}
