import assert from 'node:assert/strict';
import path from 'node:path';

export async function patientAgentTests({
  base,
  call,
  check,
  owner,
  alice,
  bob,
  appointment,
  other,
  cancelled,
  sql,
}) {
  const input = {
    name: 'Synthetic personal agent',
    access: 'read',
    expiresInDays: 7,
    confirm: true,
  };
  const request = async (route, token, body, method, extras = {}) => {
    const response = await fetch(base + route, {
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      method: method || (body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...extras,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text,
      json: () => JSON.parse(text),
    };
  };
  const rpc = (token, name, args = {}) =>
    request('/api/mcp', token, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name, arguments: args },
    });
  const failed = (data) => assert.ok(data.error || data.result?.isError);
  let reader, limitedOwner, readerId;
  await check(
    'patient token issuance is browser-only, explicit, bounded and stores no plaintext in metadata',
    async () => {
      assert.equal((await call('/api/patient-agent', input)).status, 401);
      for (const changes of [
        { scopes: ['*'] },
        { confirm: false },
        { expiresInDays: 31 },
      ])
        assert.equal(
          (
            await call(
              '/api/patient-agent',
              { ...input, ...changes },
              bob.cookie,
            )
          ).status,
          400,
        );
      assert.equal(
        (
          await request('/api/patient-agent', '', input, 'POST', {
            cookie: bob.cookie,
            origin: 'https://elsewhere.invalid',
          })
        ).status,
        403,
      );
      const response = await call('/api/patient-agent', input, alice.cookie);
      assert.equal(response.status, 201, response.text);
      assert.match(response.headers.get('cache-control'), /no-store/);
      reader = response.json().token;
      assert.match(reader, /^nsk_[A-Za-z0-9_-]{43}$/);
      const metadata = await call(
        '/api/patient-agent',
        undefined,
        alice.cookie,
      );
      assert.doesNotMatch(metadata.text, /nsk_|tokenHash/);
      readerId = metadata.json().tokens[0].id;
      assert.equal(
        (
          await request('/api/patient-agent', reader, input, 'POST', {
            cookie: alice.cookie,
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await request('/api/tokens', reader, { name: 'Forbidden' }, 'POST', {
            cookie: owner.cookie,
          })
        ).status,
        401,
      );
    },
  );
  await check(
    'patient audience attenuates owner role, scopes and cross-patient reads/writes over REST and MCP',
    async () => {
      const response = await call(
        '/api/patient-agent',
        { ...input, access: 'book' },
        owner.cookie,
      );
      assert.equal(response.status, 201, response.text);
      limitedOwner = response.json().token;
      assert.deepEqual(
        (await request('/api/bookings', limitedOwner)).json().bookings,
        [],
      );
      assert.equal(
        (await request(`/api/bookings/${appointment.id}`, limitedOwner)).status,
        404,
      );
      assert.equal(
        (await request(`/api/bookings/${other.id}`, reader)).status,
        404,
      );
      assert.equal(
        (
          await request(
            `/api/bookings/${other.id}`,
            limitedOwner,
            { action: 'cancel', revision: other.revision },
            'PATCH',
          )
        ).status,
        404,
      );
      assert.ok(
        [401, 403].includes(
          (
            await request(
              `/api/bookings/${appointment.id}`,
              reader,
              { action: 'cancel', revision: appointment.revision },
              'PATCH',
            )
          ).status,
        ),
      );
      const mine = (await request('/api/bookings', reader)).json().bookings;
      assert.ok(
        mine.length > 0 && mine.every((b) => b.customerId === alice.id),
      );
      const tools = (
        await request('/api/mcp', limitedOwner, {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        })
      ).json().result.tools;
      assert.ok(tools.some((t) => t.name === 'get_page_markdown'));
      assert.ok(tools.some((t) => t.name === 'create_booking'));
      assert.ok(
        !tools.some((t) =>
          [
            'list_customers',
            'upsert_page',
            'create_booking_slot',
            'list_files',
          ].includes(t.name),
        ),
      );
      failed((await rpc(limitedOwner, 'list_customers')).json());
      failed(
        (await rpc(limitedOwner, 'get_booking', { id: appointment.id })).json(),
      );
      assert.equal(
        (await request('/api/booking-activity', limitedOwner)).status,
        403,
      );
      assert.ok(
        [401, 403].includes(
          (
            await request('/api/booking-slots', limitedOwner, {
              action: 'create_resource',
              name: 'Forbidden',
              timeZone: 'America/New_York',
            })
          ).status,
        ),
      );
      const args = {
        slotId: cancelled.slotId,
        idempotencyKey: crypto.randomUUID(),
      };
      const created = (await rpc(limitedOwner, 'create_booking', args)).json();
      assert.ok(!created.error && !created.result?.isError);
      const booking = JSON.parse(created.result.content[0].text).booking;
      assert.equal(booking.customerId, owner.id);
      const replay = (await rpc(limitedOwner, 'create_booking', args)).json();
      assert.equal(
        JSON.parse(replay.result.content[0].text).booking.id,
        booking.id,
      );
      const cancelledOwn = (
        await rpc(limitedOwner, 'update_booking', {
          id: booking.id,
          action: 'cancel',
          revision: booking.revision,
        })
      ).json();
      assert.ok(!cancelledOwn.error && !cancelledOwn.result?.isError);
    },
  );
  await check(
    'same public Markdown through pages, content API, llms and patient MCP; private paths remain private',
    async () => {
      for (const slug of [
        '/',
        '/about',
        '/dental-exam',
        '/catalog',
        '/catalog/synthetic-examination',
      ]) {
        const api = await call(`/api/content?slug=${encodeURIComponent(slug)}`);
        assert.equal(api.status, 200, slug);
        assert.doesNotMatch(api.text, /Northstar Engine/);
        const negotiated = await request(slug, '', undefined, 'GET', {
          accept: 'text/markdown',
        });
        assert.equal(negotiated.status, 200);
        assert.equal(negotiated.text, api.text);
        assert.match(negotiated.headers.get('vary'), /accept/i);
        const mcp = (await rpc(reader, 'get_page_markdown', { slug })).json();
        assert.ok(!mcp.error && !mcp.result?.isError);
        assert.equal(JSON.parse(mcp.result.content[0].text).markdown, api.text);
      }
      const html = await request('/', '', undefined, 'GET', {
        accept: 'text/html, text/markdown;q=0',
      });
      assert.match(html.headers.get('content-type'), /text\/html/);
      assert.match(html.headers.get('vary'), /accept/i);
      assert.equal(
        (
          await request('/about', '', undefined, 'HEAD', {
            accept: 'text/markdown',
          })
        ).text,
        '',
      );
      for (const slug of [
        '/account',
        '/admin',
        '/login',
        '/api/tokens',
        '/unknown-page',
      ])
        assert.equal((await call(`/api/content?slug=${slug}`)).status, 404);
      assert.equal(
        (
          await request('/account', '', undefined, 'GET', {
            accept: 'text/markdown',
          })
        ).status,
        307,
      );
      const guide = await call('/llms.txt'),
        full = await call('/llms-full.txt');
      assert.match(guide.text, /OraVera/);
      assert.match(guide.text, /patient|Patient/);
      assert.match(full.text, /Dental/);
      assert.doesNotMatch(full.text, /Northstar Engine|tokenHash|nsk_/);
      const openapi = await call('/api/openapi');
      assert.match(openapi.text, /patient-agent/);
    },
  );
  await check(
    'draft preset overrides and hidden fields never escape public Markdown, even with owner credentials',
    async () => {
      const createPage = async (body) => {
        const response = await call('/api/pages', body, owner.cookie);
        assert.equal(response.status, 201, response.text);
        return response.json().page;
      };
      await createPage({
        slug: '/photo-guidance',
        title: 'DRAFT_SECRET',
        status: 'draft',
        blocks: ['DRAFT_SECRET'],
      });
      await createPage({
        slug: '/public-agent-test',
        title: 'Public example',
        status: 'published',
        blocks: [
          { type: 'paragraph', text: 'Visible text', private: 'HIDDEN_SECRET' },
        ],
      });
      for (const auth of ['', reader, limitedOwner]) {
        assert.equal(
          (await request('/api/content?slug=/photo-guidance', auth)).status,
          404,
        );
        if (auth)
          failed(
            (
              await rpc(auth, 'get_page_markdown', { slug: '/photo-guidance' })
            ).json(),
          );
      }
      const rendered = await call('/api/content?slug=/public-agent-test');
      assert.match(rendered.text, /Visible text/);
      assert.doesNotMatch(rendered.text, /HIDDEN_SECRET/);
      const full = await call('/llms-full.txt');
      assert.doesNotMatch(
        full.text,
        /DRAFT_SECRET|HIDDEN_SECRET|<!-- \/photo-guidance -->/,
      );
      const legacy = await call(
        '/api/tokens',
        {
          name: 'Legacy pages reader',
          scopes: ['pages:read'],
          expiresInDays: 1,
        },
        owner.cookie,
      );
      assert.equal(legacy.status, 201);
      assert.ok(
        !(
          await rpc(legacy.json().token, 'get_page_markdown', {
            slug: '/public-agent-test',
          })
        ).json().result.isError,
      );
      failed(
        (
          await rpc(legacy.json().token, 'get_page_markdown', {
            slug: '/photo-guidance',
          })
        ).json(),
      );
    },
  );
  await check(
    'only issuer can revoke; expiry and revocation invalidate future Bearer requests',
    async () => {
      assert.equal(
        (
          await call(
            `/api/patient-agent?id=${readerId}`,
            {},
            bob.cookie,
            'DELETE',
          )
        ).status,
        404,
      );
      const expiring = await call(
        '/api/patient-agent',
        { ...input, name: 'Expiry test' },
        bob.cookie,
      );
      const tokenId = (await call('/api/patient-agent', undefined, bob.cookie))
        .json()
        .tokens.find((t) => t.name === 'Expiry test').id;
      await sql(`UPDATE api_tokens SET expires_at=1 WHERE id='${tokenId}'`);
      assert.equal(
        (await request('/api/bookings', expiring.json().token)).status,
        401,
      );
      assert.equal(
        (
          await call(
            `/api/patient-agent?id=${readerId}`,
            {},
            alice.cookie,
            'DELETE',
          )
        ).status,
        200,
      );
      assert.equal((await request('/api/bookings', reader)).status, 401);
    },
  );
}

export async function patientAgentBrowserTests({ page, check, state }) {
  await check(
    'patient agent browser flow: review, one-time secret, hide, revoke and mobile layout',
    async () => {
      await page
        .getByRole('button', { name: 'Your AI agent', exact: true })
        .click();
      await page
        .getByText('No agent connections yet.', { exact: true })
        .waitFor();
      await page
        .getByLabel('Agent name', { exact: true })
        .fill('Browser synthetic agent');
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page
          .getByRole('button', { name: 'Your AI agent', exact: true })
          .scrollIntoViewIfNeeded();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          String(width),
        );
        await page.screenshot({ path: path.join(state, `agent-${width}.png`) });
        await page
          .getByRole('button', { name: 'Review access', exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(state, `agent-form-${width}.png`),
        });
      }
      await page.setViewportSize({ width: 320, height: 900 });
      await page
        .getByRole('combobox', { name: 'Permissions', exact: true })
        .click();
      await page
        .getByRole('option', { name: 'Manage my appointments', exact: true })
        .click();
      await page
        .getByRole('combobox', { name: 'Expires after', exact: true })
        .click();
      await page.getByRole('option', { name: '1 day', exact: true }).click();
      await page
        .getByRole('button', { name: 'Review access', exact: true })
        .click();
      await page.getByRole('alertdialog').waitFor();
      assert.match(
        await page.getByRole('alertdialog').innerText(),
        /reschedule and cancel/,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    await page.screenshot({
      path: path.join(state, 'agent-confirm-mobile.png'),
      animations: 'disabled',
    });
    assert.ok(await page.getByRole('alertdialog').evaluate(element => {
      const style = getComputedStyle(element);
      return style.backgroundColor !== 'rgba(0, 0, 0, 0)' && Number(style.opacity) === 1;
    }), 'Confirmation dialog must be opaque and readable');
      await page
        .getByRole('button', { name: 'Confirm and create token', exact: true })
        .click();
      const secret = page.getByRole('textbox', {
        name: 'New agent token',
        exact: true,
      });
      await secret.waitFor();
      assert.match(await secret.inputValue(), /^nsk_/);
      assert.equal(
        await page.evaluate(() =>
          JSON.stringify({ ...localStorage, ...sessionStorage }).includes(
            'nsk_',
          ),
        ),
        false,
      );
      await page
        .getByRole('button', { name: 'Hide token', exact: true })
        .click();
      assert.equal(await secret.count(), 0);
      await page
        .getByRole('button', { name: 'Your AI agent', exact: true })
        .click();
      await page
        .getByRole('button', { name: 'Your AI agent', exact: true })
        .click();
      await page
        .getByRole('button', {
          name: 'Revoke Browser synthetic agent',
          exact: true,
        })
        .click();
      await page
        .getByRole('button', { name: 'Confirm revocation', exact: true })
        .click();
      await page
        .getByText('No agent connections yet.', { exact: true })
        .waitFor();
      await page
        .getByRole('button', { name: 'Your AI agent', exact: true })
        .click();
    },
  );
}
