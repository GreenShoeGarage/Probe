# PROBE native companion — 1.8.0-rc.1

This candidate provides Nmap TCP/UDP acquisition and bounded host discovery, OpenOCD/GDB debugger integration and isolated ZIP/TAR/CPIO/gzip/bzip2/xz/SquashFS extraction. Native binaries are not bundled. This document covers the shared companion and scanning; see `DEBUGGER-BENCH.md` and `FIRMWARE.md` for the new adapters. Real-tool acceptance remains outstanding.

## Start

Install Node.js 22+ and Nmap from their official distributions. No npm packages are needed. Linux is the initial test platform; process tests pass using a simulator. macOS is implemented through the same POSIX process model but unverified. Windows is not supported by this candidate.

From the unpacked package root:

```sh
node companion/server.mjs --allow 192.168.1.10
```

Replace the address with your assessment scope. Multiple addresses/CIDRs can be separated by commas; allowed CIDRs are /16 through /32. Without `--allow`, only 127.0.0.1 is permitted. Opening the app never starts a scan. The companion binds only to 127.0.0.1. Use its printed URL (default `http://127.0.0.1:8844`), not a LAN address or hosted URL. Pair in NETWORK using the terminal code.

Optional arguments:

| Option | Meaning |
| --- | --- |
| `--port 8844` | Local UI/API port, 1024–65535 |
| `--allow 192.168.1.10,192.168.2.0/26` | Operator-controlled destination allowlist |
| `--data-dir /absolute/path` | Evidence directory; default `~/.probe/scans` |
| `--nmap /absolute/path/to/nmap` | Explicit executable when Nmap is not on PATH |

Changing the port changes the browser origin and therefore its IndexedDB workspace. Export/import your project when changing origins. The hosted edition and companion edition do not synchronize data; use project JSON to transfer it.

## Scan workflow

1. Create/import an assessment and choose its device. Pair the companion.
2. Configure a label, numeric IPv4 or exact IPv6 targets, acquisition mode and selected ports and vantage/device conditions. Hostnames and custom Nmap arguments are unavailable.
3. Review every expanded destination and the exact argument array. Scan CIDRs are /26 or smaller. Limits: 64 hosts, 256 ports, 4,096 host/port pairs, rate ceiling 1–100, overall timeout 10–300 seconds.
4. Start a TCP connect scan. Nmap runs with `--unprivileged -sT -Pn -n --disable-arp-ping`, one retry and a per-host timeout of at most 60 seconds. Service/version detection is an explicit optional `-sV --version-light` profile addition. It sends extra application probes; the connect-scan rate ceiling does not bound all such probes.
5. Inspect status and cancel if needed. A percentage, when available, is Nmap's current phase, not overall completion. Elapsed time and captured byte count are always available while connected.
6. Choose **Preserve evidence**. This retains exact XML plus a JSON envelope containing metadata and base64 XML/stderr with hashes. A failed, cancelled or truncated job can still be preserved. Parsing errors do not delete its originals.
7. Use **Repeat setup**, review and start deliberately. Compare preserved scans. The comparison can create a finding with both acquisition records selected as evidence.

Inventory records update only from observations. Nmap's aggregate closed/filtered state is expanded only when the successful matching XML identifies every requested host and exactly accounts for the remaining ports. Narrower or incomplete scans never imply closure by omission. A port-table service name is a guess; `method="probed"` is shown separately.

## Local evidence and recovery

Each job writes `<id>/job.json`, `output.xml` and `stderr.log` beneath the evidence directory. The directory is private to the local user (0700); files use 0600 permissions. It stores targets, options, tool/platform versions, acquisition times, exit status and errors, along with original output. This is local evidence, not encrypted storage. Hashes identify bytes, not authorship.

Only one job runs at a time. The companion retains at most 20 jobs, with 4 MiB XML and 256 KiB stderr per job. It stops on output limits and preserves the accepted prefix. It never silently deletes old jobs. Export/preserve the records, stop the companion, and archive the whole data directory before starting a fresh collection. A project can contain up to 100 scan records, subject to its 128 MiB evidence limit. Original XML is intentionally retained both individually and inside the acquisition envelope for portability.

Closing or reloading the browser does not cancel a native job. Reopen the same origin/project and pair again if necessary; completed jobs remain available. **Ctrl+C** stops owned processes and flushes their evidence. An abrupt process/OS termination can lose data still buffered by the OS and can leave a native child running; ensure it has stopped before recovery. Never launch a replacement scan merely because the browser lost contact.

The evidence directory has an exclusive `.companion-lock` containing the controller PID. A second companion cannot open it. After an abnormal stop, first ensure the previous controller and its scan have stopped, then remove only that lock file and restart. In-progress records become `interrupted`; output is rehashed and no scan is replayed. Preserve the directory if a storage error blocks recovery.

Pairing uses a random terminal code, a bearer token scoped to one browser session and an eight-hour lifetime. Re-pairing replaces the token; restarting replaces both. Tokens stay in sessionStorage, never project JSON. Requests require the exact local Host, approved Origin when provided, and a custom header. API responses are never cached by the service worker. There is no remote shell, arbitrary argument endpoint, privilege elevation or automatic hosted-to-local bridge.

## Real-Nmap acceptance checklist (open)

- Record Linux distribution, Node/Nmap versions, browser, effective privileges and the exact installed executable.
- Start a known loopback TCP service on a selected port. Launch with `--allow 127.0.0.1`; scan only that host/port. Verify the service is explicitly open in original Nmap XML.
- Preserve it, stop the service, repeat the same profile and confirm the independently known state change. Check aggregate closed-state interpretation against the original XML.
- Export scan JSON and full project JSON, reimport both, and independently recompute original hashes. Confirm baseline/finding links survive.
- Exercise optional version detection against a recoverable reference service. Record its side effects and distinguish port-table from probed identities.
- Exercise cancellation, overall/per-host timeouts, missing executable, malformed and out-of-allowlist inputs, storage limits and interruption recovery. Ensure owned processes stop; confirm partial output remains partial.
- Use a controlled lab target with an explicit allowlist, then publish the exact supported OS/tool matrix. Do not promote the candidate from simulated evidence alone.

## References

- [Nmap scan techniques](https://nmap.org/book/man-port-scanning-techniques.html)
- [Nmap XML output](https://nmap.org/book/output-formats-xml-output.html)
- [Node child processes](https://nodejs.org/api/child_process.html)

OpenOCD/GDB integration is implemented; physical acceptance remains open. See DEBUGGER-BENCH.md. Use Companion status for tool readiness and redacted diagnostics. Stop the companion before running `node companion/archive.mjs --data-dir SOURCE --output NEW_DIRECTORY`; originals remain intact. Start the next collection with a different data directory.

## Readiness, recovery and acceptance

Open **Companion status** in the sidebar after pairing. It reports installed tools, extraction isolation, retained/active/interrupted acquisitions and recovery guidance. Export diagnostics omits targets, project/device identities, paths, raw errors, transcripts, tokens and evidence content.

After stopping the companion, archive without deleting originals:

```sh
node companion/archive.mjs --data-dir ./probe-data --output ./archive-unique-name
```

The output directory must be new. The command shares the companion lock, rejects links/special files, copies regular files, independently rehashes the copies, writes ARCHIVE-MANIFEST.json, and atomically finishes the archive. A failed operation can leave an explicitly reported partial directory; the source stays intact. Start a fresh collection with a different --data-dir. A stale lock requires operator review of the recorded process before removal.

Run controlled native acceptance into fresh directories:

```sh
node companion/network-bench.mjs --output ./network-bench
node companion/network-bench.mjs --family 6 --output ./network-bench-v6
node companion/extraction-bench.mjs --output ./extraction-bench
```

Network checks use a loopback HTTP listener and actual tool envelopes. Service identification or a too-fast cancellation may be inconclusive. The extraction runner checks a known ZIP, excluded traversal/oversized entries, hashes and cancellation; independent host isolation inspection remains a separate check. Import bench-report.json in ASSESSMENT → Qualification. The runner exit code is nonzero for incomplete/blocked results.

IPv6 allowlists accept explicit numeric hosts only (for example `--allow 2001:db8::1`). Each scan contains one family and at most 64 hosts/256 ports/4,096 pairs. IPv6 uses -6. Link-local addresses require an exact interface suffix in the allowlist and each target; one interface per scan. IPv6 CIDR expansion, unspecified, multicast and mapped addresses are excluded. Saved drafts never bypass preview, allowlist checks or the final destination review.

## v1.7 acquisition modes

TCP remains the default and retains the existing 64-host/256-port/4,096-pair limits. UDP is disabled unless the operator starts with `--udp enabled`. This option does not grant privileges, change capabilities or run sudo. Configure the installed Nmap according to the host's approved administration process; otherwise its actual permission error is preserved. UDP uses `--privileged -sU -Pn`; discovery uses `--unprivileged -sn -PS<ports>`. Both disable DNS and implicit ARP ping selection, retain one retry and timeout/output limits, cap selected scope at 16 hosts × 16 ports and configured rate at 20, and reject service/version detection. Nmap and the OS may perform required link-layer neighbor resolution. Rate flags are not a measured guarantee of wire traffic.

Select mode in New scan or a saved profile. Review exact argv and destinations before Start. All runs revalidate against the active allowlist. Saved drafts never execute themselves. UDP `open|filtered` remains uncertain. Discovery reports host states, not port openness; missing/down/no-response observations never establish an absent device. Native records retain mode, original XML/stderr and hashes. Imported old profiles default to TCP.

For link-local IPv6, e.g. `--allow fe80::1%eth0`, the exact same interface is required in targets. The adapter supplies `-e eth0` and scoped numeric destinations without shell interpolation. Standalone XML containing unscoped link-local addresses cannot establish their interface and is rejected; import the scoped PROBE acquisition envelope instead. Native UDP, discovery and link-local behavior still require intended-host qualification with installed Nmap.
