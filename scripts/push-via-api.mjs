/**
 * Push the working tree to GitHub over the REST API.
 *
 * Used when github.com:443 is unreachable (connect / TLS handshake timeouts) while
 * api.github.com keeps answering: Blob, Tree and Commit creation all work over the
 * API, so the only thing git adds on top is the ref move, which is one PATCH.
 *
 * The remote tip commit is usually NOT in the local object database (it was created
 * by the API), so the changed-path list is computed by comparing the remote tree with
 * `git ls-tree -r HEAD`. Git blob ids are content hashes, so equal ids mean equal
 * bytes and nothing has to be fetched.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const REPO = "jiyeguang25/dsh-ui-tidy";
const cwd = process.cwd();
const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 << 20 }).trim();
const token = execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();

const api = async (path, init = {}) => {
	const res = await fetch("https://api.github.com" + path, {
		...init,
		headers: {
			Authorization: "Bearer " + token,
			Accept: "application/vnd.github+json",
			"X-GitHub-Api-Version": "2022-11-28",
			"Content-Type": "application/json",
			...(init.headers || {}),
		},
	});
	const text = await res.text();
	if (!res.ok) throw new Error(path + " -> " + res.status + " " + text.slice(0, 400));
	return text === "" ? null : JSON.parse(text);
};

const ref = await api(`/repos/${REPO}/git/ref/heads/main`);
const parentSha = ref.object.sha;
const remoteTree = await api(`/repos/${REPO}/git/trees/${parentSha}?recursive=1`);
const remoteBlobs = new Map();
for (const entry of remoteTree.tree) if (entry.type === "blob") remoteBlobs.set(entry.path, entry.sha);

const localBlobs = new Map();
for (const line of git("ls-tree", "-r", "HEAD").split("\n").filter(Boolean)) {
	const [meta, path] = line.split("\t");
	const [mode, type, sha] = meta.split(" ");
	if (type === "blob") localBlobs.set(path, { mode, sha });
}

const tree = [];
const changed = [];
for (const [path, info] of localBlobs) {
	if (remoteBlobs.get(path) === info.sha) continue;
	const content = readFileSync(cwd + "/" + path);
	const blob = await api(`/repos/${REPO}/git/blobs`, {
		method: "POST",
		body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
	});
	tree.push({ path, mode: info.mode, type: "blob", sha: blob.sha });
	changed.push(path);
}
for (const path of remoteBlobs.keys()) {
	if (localBlobs.has(path)) continue;
	tree.push({ path, mode: "100644", type: "blob", sha: null });
	changed.push("[deleted] " + path);
}

if (tree.length === 0) {
	console.log(JSON.stringify({ upToDate: true, remoteSha: parentSha }));
	process.exit(0);
}

const newTree = await api(`/repos/${REPO}/git/trees`, {
	method: "POST",
	body: JSON.stringify({ base_tree: remoteTree.sha, tree }),
});
const message = git("log", "-1", "--format=%B", "HEAD").trim();
const commit = await api(`/repos/${REPO}/git/commits`, {
	method: "POST",
	body: JSON.stringify({ message, tree: newTree.sha, parents: [parentSha] }),
});
await api(`/repos/${REPO}/git/refs/heads/main`, {
	method: "PATCH",
	body: JSON.stringify({ sha: commit.sha, force: false }),
});
console.log(JSON.stringify({ parentSha, remoteSha: commit.sha, changed }, null, 1));
