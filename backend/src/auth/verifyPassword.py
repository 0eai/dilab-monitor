#!/usr/bin/env python3
"""
Verify a Linux user password against /etc/shadow.
Reads: username from argv[1], password from stdin (to keep it out of process list).
Exit code: 0 = success, 1 = wrong password, 2 = error
"""
import sys

# crypt was removed in Python 3.13 — use crypt-r drop-in replacement
try:
    import crypt
except ImportError:
    try:
        import crypt_r as crypt
    except ImportError:
        print("Missing crypt module. Run: pip install crypt-r", file=sys.stderr)
        sys.exit(2)

def get_shadow_hash(username):
    """Read hashed password from /etc/shadow directly (replaces spwd)."""
    try:
        with open('/etc/shadow', 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if parts[0] == username:
                    return parts[1]
    except PermissionError:
        print("Permission denied reading /etc/shadow.", file=sys.stderr)
        print("Fix: sudo usermod -aG shadow $(whoami) && exec su -l $USER", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"Error reading shadow file: {e}", file=sys.stderr)
        sys.exit(2)
    raise KeyError(username)

if len(sys.argv) < 2:
    print("Usage: verifyPassword.py <username>", file=sys.stderr)
    sys.exit(2)

username = sys.argv[1]

try:
    password = sys.stdin.readline().rstrip('\n')
except Exception as e:
    print(f"Failed to read password: {e}", file=sys.stderr)
    sys.exit(2)

try:
    stored_hash = get_shadow_hash(username)

    if not stored_hash or stored_hash in ('!', '*', '!!'):
        print("Account locked or has no password", file=sys.stderr)
        sys.exit(1)
    if stored_hash.startswith('!') or stored_hash.startswith('*'):
        print("Account locked", file=sys.stderr)
        sys.exit(1)

    computed = crypt.crypt(password, stored_hash)

    if computed == stored_hash:
        sys.exit(0)   # correct password
    else:
        sys.exit(1)   # wrong password

except KeyError:
    print(f"User not found: {username}", file=sys.stderr)
    sys.exit(2)
except Exception as e:
    print(f"Unexpected error: {e}", file=sys.stderr)
    sys.exit(2)