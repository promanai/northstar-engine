import assert from 'node:assert/strict';
export async function fileTests({
  call,
  check,
  adminCookie,
  aliceCookie,
  bobCookie,
  sql,
  base,
}) {
  const upload = async ({
    cookie = aliceCookie,
    key = crypto.randomUUID(),
    name = 'заметка.txt',
    type = 'text/plain',
    content = 'private text',
    headers = {},
    extra = false,
  } = {}) => {
    const form = new FormData();
    form.append('file', new Blob([content], { type }), name);
    if (extra) form.append('unexpected', 'bad');
    const response = await fetch(base + '/api/files', {
      method: 'POST',
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
        ...headers,
      },
      body: form,
      signal: AbortSignal.timeout(30000),
    });
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: response.headers,
    });
  };
  const list = async (cookie = aliceCookie) =>
    (await call('/api/files', undefined, cookie)).json();
  const remove = (
    id,
    cookie = aliceCookie,
    body = { confirm: true },
    headers = {},
  ) => call(`/api/files/${id}`, body, cookie, headers, 'DELETE');
  const mint = async (scopes) => {
    const response = await call(
      '/api/tokens',
      { name: 'file-test', expiresInDays: 1, scopes },
      aliceCookie,
    );
    assert.equal(response.status, 201);
    return (await response.json()).token;
  };
  const headers = (token) => ({ authorization: `Bearer ${token}` });
  const invoke = async (token, name, args = {}) =>
    (
      await call(
        '/api/mcp',
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name, arguments: args },
        },
        '',
        headers(token),
      )
    ).json();
  const failed = (result) =>
    assert.ok(result.error || result.result?.isError, JSON.stringify(result));
  let file, bobFile, reader, writer;
  const key = crypto.randomUUID();
  await check(
    'files reject anonymous uploads, missing keys, cross-origin and malformed forms',
    async () => {
      assert.equal((await upload({ cookie: '' })).status, 401);
      assert.equal((await call('/api/files')).status, 401);
      assert.equal((await upload({ key: null })).status, 400);
      assert.equal(
        (await upload({ headers: { origin: 'https://foreign.test' } })).status,
        403,
      );
      assert.equal((await upload({ extra: true })).status, 400);
      assert.equal(
        (
          await call('/api/files', {}, aliceCookie, {
            'Idempotency-Key': crypto.randomUUID(),
          })
        ).status,
        415,
      );
      const malformed = await fetch(base + '/api/files', {
        method: 'POST',
        headers: {
          cookie: aliceCookie,
          'content-type': 'multipart/form-data; boundary=test',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: 'invalid',
      });
      assert.equal(malformed.status, 400);
      await malformed.text();
    },
  );
  await check(
    'files reject spoofed formats, executable HTML and oversized content',
    async () => {
      assert.equal(
        (await upload({ name: 'fake.png', type: 'image/png' })).status,
        400,
      );
      assert.equal(
        (await upload({ name: 'a.html', type: 'text/html' })).status,
        400,
      );
      assert.equal(
        (await upload({ name: 'a.txt', content: new Uint8Array([255]) }))
          .status,
        400,
      );
      assert.equal(
        (await upload({ content: new Uint8Array(2 * 1024 * 1024 + 20000) }))
          .status,
        413,
      );
      assert.equal((await list()).usage.count, 0);
    },
  );
  await check(
    'file upload is private, durable and idempotent without internal metadata',
    async () => {
      const response = await upload({ key });
      assert.equal(response.status, 201);
      const data = await response.json();
      file = data.file;
      assert.equal(file.status, 'uploaded');
      assert.equal(file.objectKey, undefined);
      assert.equal(file.contentHash, undefined);
      assert.equal(file.requestKey, undefined);
      const replay = await upload({ key });
      assert.equal(replay.status, 200);
      assert.equal((await replay.json()).file.id, file.id);
      assert.equal((await upload({ key, content: 'different' })).status, 409);
      assert.equal((await list()).usage.count, 1);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    },
  );
  await check(
    'file download forces attachment, no-store, nosniff and no public URL',
    async () => {
      const response = await call(file.downloadUrl, undefined, aliceCookie);
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'private text');
      assert.equal(
        response.headers.get('content-type'),
        'application/octet-stream',
      );
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.match(
        response.headers.get('content-disposition'),
        /^attachment;.*filename\*=UTF-8''/,
      );
      assert.match(response.headers.get('content-security-policy'), /sandbox/);
      assert.equal((await call(file.downloadUrl)).status, 401);
    },
  );
  await check(
    'customers cannot list, read, download or delete other owners files',
    async () => {
      bobFile = (await (await upload({ cookie: bobCookie })).json()).file;
      assert.equal((await list(bobCookie)).files.length, 1);
      for (const route of [`/api/files/${file.id}`, file.downloadUrl])
        assert.equal((await call(route, undefined, bobCookie)).status, 404);
      assert.equal((await remove(file.id, bobCookie)).status, 404);
      assert.equal(
        (await call('/api/files?all=true', undefined, aliceCookie)).status,
        403,
      );
      assert.equal(
        (await call('/api/files?all=oops', undefined, adminCookie)).status,
        400,
      );
      const all = await (
        await call('/api/files?all=true', undefined, adminCookie)
      ).json();
      assert.equal(all.files.length, 2);
      assert.equal(
        (await call(file.downloadUrl, undefined, adminCookie)).status,
        200,
      );
    },
  );
  await check(
    'concurrent uploads atomically reserve the per-user quota',
    async () => {
      const responses = await Promise.all([upload(), upload()]);
      assert.deepEqual(
        responses.map((r) => r.status).sort((a, b) => a - b),
        [201, 409],
      );
      const second = (await responses.find((r) => r.status === 201).json())
        .file;
      assert.equal((await list()).usage.count, 2);
      assert.equal((await remove(second.id)).status, 200);
    },
  );
  await check(
    'concurrent retries create exactly one file for a request key',
    async () => {
      const duplicateKey = crypto.randomUUID();
      const responses = await Promise.all([
        upload({ key: duplicateKey }),
        upload({ key: duplicateKey }),
      ]);
      assert.ok(responses.some((r) => r.status === 201));
      assert.ok(responses.every((r) => [200, 201, 409].includes(r.status)));
      const replay = await upload({ key: duplicateKey });
      assert.equal(replay.status, 200);
      assert.equal((await list()).usage.count, 2);
      await remove((await replay.json()).file.id);
    },
  );
  await check(
    'file agents have scoped API/MCP access and cannot bypass ownership',
    async () => {
      reader = await mint(['files:read']);
      writer = await mint(['files:write']);
      assert.equal(
        (await call(file.downloadUrl, undefined, '', headers(reader))).status,
        200,
      );
      assert.equal(
        (await remove(file.id, '', { confirm: true }, headers(reader))).status,
        401,
      );
      assert.equal(
        (await call(file.downloadUrl, undefined, adminCookie, headers(writer)))
          .status,
        401,
      );
      assert.equal(
        (await call(bobFile.downloadUrl, undefined, '', headers(reader)))
          .status,
        404,
      );
      const mine = await invoke(reader, 'list_files');
      assert.ok(
        mine.result.structuredContent.files.some((f) => f.id === file.id),
      );
      assert.equal(
        (await invoke(reader, 'get_file', { id: file.id })).result
          .structuredContent.file.id,
        file.id,
      );
      failed(await invoke(reader, 'get_file', { id: bobFile.id }));
      failed(await invoke(reader, 'list_files', { all: true }));
      failed(
        await invoke(reader, 'delete_file', { id: file.id, confirm: true }),
      );
      failed(
        await invoke(writer, 'delete_file', { id: bobFile.id, confirm: true }),
      );
      failed(
        await invoke(writer, 'delete_file', { id: file.id, confirm: false }),
      );
      const uploaded = await upload({ cookie: '', headers: headers(writer) });
      assert.equal(uploaded.status, 201);
      const id = (await uploaded.json()).file.id;
      assert.equal(
        (await invoke(writer, 'delete_file', { id, confirm: true })).result
          .structuredContent.file.status,
        'deleted',
      );
    },
  );
  await check(
    'deletion requires confirmation/origin and safely repeats, retaining a tombstone',
    async () => {
      assert.equal((await remove(file.id, aliceCookie, {})).status, 400);
      assert.equal(
        (await remove(file.id, aliceCookie, { confirm: true, unknown: true }))
          .status,
        400,
      );
      assert.equal(
        (
          await remove(
            file.id,
            aliceCookie,
            { confirm: true },
            { origin: 'https://foreign.test' },
          )
        ).status,
        403,
      );
      assert.equal((await remove(file.id)).status, 200);
      assert.equal((await remove(file.id)).status, 200);
      assert.equal(
        (await call(file.downloadUrl, undefined, aliceCookie)).status,
        409,
      );
      assert.equal((await list()).usage.count, 0);
      assert.equal((await upload({ key })).status, 409);
      assert.equal(
        (await sql(`SELECT status FROM files WHERE id='${file.id}'`))[0].status,
        'deleted',
      );
    },
  );
  await check(
    'byte quotas reject excess even when file count has room',
    async () => {
      const first = await upload({ content: 'a'.repeat(50000) });
      assert.equal(first.status, 201);
      assert.equal((await upload({ content: 'b'.repeat(40000) })).status, 409);
      assert.equal((await list()).usage.count, 1);
      await remove((await first.json()).file.id);
    },
  );
  await check(
    'site-wide count and byte quotas apply across owners',
    async () => {
      await sql(
        `INSERT INTO files (id,user_id,object_key,filename,content_type,size,status,created_at,updated_at) VALUES ('file-site-bytes', '${bobFile.userId}', 'test/site-bytes','x.txt','text/plain',131072,'uploading',1,1)`,
      );
      assert.equal((await upload({ cookie: adminCookie })).status, 409);
      await sql("DELETE FROM files WHERE id='file-site-bytes'");
      for (let i = 0; i < 5; i++)
        await sql(
          `INSERT INTO files (id,user_id,object_key,filename,content_type,size,status,created_at,updated_at) VALUES ('file-site-${i}', '${bobFile.userId}', 'test/site-${i}','x.txt','text/plain',1,'uploading',1,1)`,
        );
      assert.equal((await upload({ cookie: adminCookie })).status, 409);
      await sql("DELETE FROM files WHERE id LIKE 'file-site-%'");
    },
  );
  await check(
    'failed D1 finalization compensates R2 and releases reserved quota',
    async () => {
      await sql(
        "CREATE TRIGGER file_fail_finalize BEFORE UPDATE ON files WHEN NEW.status='uploaded' BEGIN SELECT RAISE(ABORT,'file-test-finalization'); END",
      );
      const failedKey = crypto.randomUUID();
      const response = await upload({ cookie: adminCookie, key: failedKey });
      assert.equal(response.status, 503);
      await sql('DROP TRIGGER file_fail_finalize');
      const row = (
        await sql(
          `SELECT id,status FROM files WHERE request_key='${failedKey}'`,
        )
      )[0];
      assert.equal(row.status, 'deleted');
      // Verify actual R2 absence, not just the tombstone gate (isolated fixture only).
      await sql(`UPDATE files SET status='uploaded' WHERE id='${row.id}'`);
      assert.equal(
        (await call(`/api/files/${row.id}/download`, undefined, adminCookie))
          .status,
        404,
      );
      await remove(row.id, adminCookie);
    },
  );
  await check(
    'failed deletion finalization remains visible and can be retried',
    async () => {
      const item = (await (await upload({ cookie: adminCookie })).json()).file;
      await sql(
        "CREATE TRIGGER file_fail_delete BEFORE UPDATE ON files WHEN NEW.status='deleted' BEGIN SELECT RAISE(ABORT,'file-test-delete'); END",
      );
      assert.equal((await remove(item.id, adminCookie)).status, 503);
      assert.equal(
        (await list(adminCookie)).files.find((f) => f.id === item.id).status,
        'deleting',
      );
      assert.equal(
        (await call(item.downloadUrl, undefined, adminCookie)).status,
        409,
      );
      await sql('DROP TRIGGER file_fail_delete');
      assert.equal((await remove(item.id, adminCookie)).status, 200);
      assert.equal((await list(adminCookie)).usage.count, 0);
    },
  );
  await check(
    'recent pending uploads are protected; stale operations are recoverable',
    async () => {
      const now = Math.floor(Date.now() / 1000);
      await sql(
        `INSERT INTO files (id,user_id,object_key,filename,content_type,size,status,created_at,updated_at) VALUES ('file-pending','${file.userId}','test/pending','x.txt','text/plain',1,'uploading',${now},${now})`,
      );
      assert.equal((await remove('file-pending')).status, 409);
      assert.equal((await list()).files[0].recoverable, false);
      await sql("UPDATE files SET updated_at=1 WHERE id='file-pending'");
      assert.equal((await list()).files[0].recoverable, true);
      assert.equal((await remove('file-pending')).status, 200);
    },
  );
  await check(
    'file list cursor is bounded and OpenAPI documents upload/download/delete',
    async () => {
      assert.equal(
        (await call('/api/files?before=%20', undefined, adminCookie)).status,
        400,
      );
      assert.equal(
        (await call('/api/files?all=true&all=false', undefined, adminCookie))
          .status,
        400,
      );
      const doc = await (await call('/api/openapi')).json();
      assert.ok(
        doc.paths['/files'].post.requestBody.content['multipart/form-data'],
      );
      assert.ok(doc.paths['/files/{id}'].delete);
      assert.ok(doc.paths['/files/{id}/download'].get);
      await remove(bobFile.id, adminCookie);
    },
  );
}
