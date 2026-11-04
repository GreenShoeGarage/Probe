# FIRMGLASS analysis — v1.8.0-rc.1

## Local inspection

Choose **Inspect firmware**. Files up to 32 MiB are analyzed in a cancellable module worker; the same immutable input is hashed and preserved as original evidence. Overview shows exact size/hash, global entropy, 64 KiB entropy regions, candidate signatures and an ELF machine clue when present. Signatures do not validate container structures or architecture applicability.

Use **Bytes** for 256-byte pages, exact UTF-8 or hex searches and numeric/hex offset jumps. Rows align to 16 bytes. Search retains the first 500 matches and reports truncation. **Strings** stores up to 5,000 ASCII runs of six or more bytes, each capped at 512 characters; 500 are displayed. Reanalyze old artifacts to add offset-aware records. String and header caps are explicit; originals remain searchable.

**Review** flags sensitive assignments/private-key blocks, selected debug/access settings, and component/version clues. Summaries mask detected sensitive candidates by default; explicit reveal and byte views can expose originals. Detection is heuristic and can miss sensitive data. Extraction text previews show the first 8 KiB, mask candidate lines/key blocks and decode as UTF-8. Project JSON and raw downloads contain unredacted originals. Reports omit raw excerpts by default; authored findings and provenance are operator-reviewed text.

## Extraction

The native adapter requires Linux, Python 3 and bubblewrap with working namespace isolation. Start the same companion used for scanning/debugging, pair, then use **Extraction → Check extractor → Extract archive**. Refresh to retrieve progress/terminal status; cancel when needed. Preserve results explicitly. The hosted app accepts portable extraction JSON with matching source hash and validated per-file hashes.

The adapter handles ZIP, TAR, CPIO newc/crc, gzip, bzip2 and xz, without recursion or executing firmware. SquashFS has an additional isolated adapter described below. UBI/uImage signatures remain clues, not extractors. Unsupported, malformed and encrypted formats produce explicit errors. Filesystem links, devices, sparse TAR entries, traversal, absolute/ambiguous paths and duplicate normalized names are rejected. Archive names are metadata only: output uses fixed numbered filenames.

Production runs the reader in bubblewrap with private namespaces (including network), read-only runtime and input, and one writable output directory. There is **no unsandboxed fallback**. Required `/usr`, `/lib` and `/lib64` runtime layout is currently the Linux candidate configuration; other layouts need adaptation and acceptance. A failed isolation probe disables native extraction while imports/local analysis remain usable.

| Limit | Value |
|---|---:|
| Input firmware | 32 MiB |
| Entries | 500 |
| Individual expanded file | 4 MiB |
| Total expanded files | 16 MiB |
| CPU / wall time | 10 / 20 seconds |
| Address-space limit | 256 MiB |
| Retained native jobs | 10 |
| Project evidence | 128 MiB |

Output bytes and manifest are saved after each complete file. Cancellation/crash/limits can retain a partial prefix; unlisted files in partial output do not establish absence. Manifests record source hash, tool, limits, per-file hashes, errors and completion status. Production cancellation/namespace enforcement is still awaiting a supported Linux bench; this environment cannot start bubblewrap isolation. Controlled synthetic parser fixtures were tested directly, without claiming sandbox execution.

## Comparison and evidence

**Compare artifacts** reports differing positional byte ranges (first 200 retained, total range count reported) and changed/added/removed extracted paths when both artifacts have manifests. File equality is hash-based. Recompression, relocation and rebuild layout changes can make positional byte diffs extensive; changes do not automatically establish a vulnerability or fix. Semantic configuration/SBOM comparison and advisory feeds remain later work.

Preserve a comparison to retain before/after artifact names, hashes and original evidence references. Add it to a finding or retest through the evidence register. Extraction, comparison and debugger-memory records survive schema 1 project export/import. Saved originals are never overwritten by reanalysis.

## Extraction acceptance — outstanding

On the intended Linux machine, verify bubblewrap namespaces/read-only mounts/no network; run known ZIP/TAR/gzip fixtures; compare every output hash independently. Check traversal, duplicate names, symlinks, device nodes, truncated members, encrypted ZIPs, entry/expansion caps and unsupported images. Cancel a job and terminate the companion mid-extraction; verify partial status, bounded resource use and no process left running. Repeat two known firmware/configuration revisions and carry the comparison through JSON export/import and a report.

## v1.5 structured comparisons and provenance

Use **Compare config / SBOM** to select two preserved originals up to 1 MiB each. JSON comparisons reject duplicate keys, excessive nesting and oversized structures. INI/key=value comparisons reject duplicate keys and unsupported lines; comments/formatting are ignored, and shell semantics are never evaluated. Candidate sensitive keys are masked in saved diffs; other values require operator review. SBOM comparisons use version-independent PURL identity where available, name-only fallback otherwise, and report duplicate identities as ambiguous. They compare declarations, not vulnerability applicability.

Inspecting an extracted file creates a child artifact with source evidence/hash, manifest evidence/hash, original member path and child hash. Project imports reject broken parent references and children not matching the manifest. Originals and earlier extraction manifests remain preserved.

## SquashFS adapter — native acceptance pending

Requires installed `unsquashfs` supporting `-pf` pseudo-file output, plus working Linux bubblewrap isolation. The adapter pipes an inert pseudo stream into a bounded parser, never interprets pseudo commands and never creates archive-supplied paths. It limits the stream to 17 MiB, metadata to 1 MiB, entries to 500 plus root, and retains the existing 4 MiB/file, 16 MiB/file-data and 20-second job limits. Native decompression uses one processor and 32 MiB cache within inherited process limits. Regular bytes use fixed numbered output names. Links, special/sparse files, unsafe paths and names requiring escaping are rejected explicitly. This deliberately narrow filename subset can yield partial inventories. Whole images only; embedded offsets, recursive extraction and UBI remain out of scope.

Parser fixtures use synthetic pseudo streams. No installed unsquashfs or working production isolation is available in the development environment; successful native extraction is not claimed. Test a known SquashFS image, malformed images, termination and output limits on the intended host before relying on this adapter. Tool design follows the upstream [Unsquashfs pseudo-file documentation](https://github.com/plougher/squashfs-tools/blob/master/Documentation/4.7.4/USAGE-UNSQUASHFS.md).

## v1.8 readers and metadata

CPIO supports one UTF-8 newc (`070701`) or byte-sum crc (`070702`) archive with an explicit `TRAILER!!!`; ordinary regular files only. Checksum failures, unsafe/duplicate paths, hard links, symbolic links, special entries, malformed fields and truncated members are reported. A rejected entry makes the result partial. Nonzero data after the trailer and concatenated archives are unsupported. This is not a general Linux initramfs unpacker.

Bzip2 and xz yield one `payload.bin` under the same 4 MiB file budget. Xz has a 64 MiB decoder memory ceiling and rejects concatenated/truncated streams. No automatic nested expansion: inspect a preserved child explicitly to keep the provenance chain. Existing gzip/TAR handling remains available. Isolation is mandatory; parser fixture execution in tests is not production isolation qualification.

ZIP permissions and TAR/CPIO permissions, UID, GID and modification time are recorded when supported. Differences appear even when content hashes match. Missing metadata means not recorded, not zero; comparisons do not prove runtime configuration. SquashFS metadata is not normalized in this release.

Literal `.env` comparison accepts `KEY=value`, optional `export`, comments and simple matching quotes. It rejects duplicate keys, interpolation, command substitution, backslash escapes and multiline syntax. It does not run shell code. Sensitive-key candidates remain masked. Full YAML, behavioral configuration evaluation, UBI/UBIFS and emulation are deferred.

Native acceptance additions: run known CPIO checksum/traversal/link/truncation cases and bzip2/xz expansion/memory limits inside the actual isolation boundary; verify metadata against independent readers and compare two revisions through project export/import.
