# Parse `docker top <container> -eo pid,uid,user` on the Linux runner.
# USER may be a name or a number; only the numeric UID proves the identity.
NR == 1 {
    if (NF != 3 || $1 != "PID" || $2 != "UID" || $3 != "USER") bad = 1
    next
}
{
    if (NF != 3 || $1 !~ /^[0-9]+$/ || $1 + 0 <= 0 || $2 != "65532") bad = 1
}
END {
    if (NR < 2 || bad) exit 1
    print "65532"
}
