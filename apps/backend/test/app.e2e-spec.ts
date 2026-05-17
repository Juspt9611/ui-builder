import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as supertest from 'supertest';
const request = (supertest as unknown as { default: typeof supertest }).default ?? supertest;
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});

describe('Chats — UNPROCESSABLE_PROMPT (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    process.env.AI_PROVIDER = 'mock';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /chats with __cannot__ returns 422 and does not create a chat', async () => {
    const res = await request(app.getHttpServer())
      .post('/chats')
      .send({ prompt: '__cannot__ please' })
      .expect(422);

    expect(res.body.errorCode).toBe('UNPROCESSABLE_PROMPT');
    expect(typeof res.body.message).toBe('string');
  });

  it('POST /chats/:id/messages with __cannot__ returns 422 and leaves chat unchanged', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/chats')
      .send({ prompt: 'build a landing page' })
      .expect(201);

    const chatId: string = createRes.body.id as string;
    const originalMessages: unknown[] = createRes.body.messages as unknown[];

    await request(app.getHttpServer())
      .post(`/chats/${chatId}/messages`)
      .send({ content: '__cannot__ this' })
      .expect(422);

    const afterRes = await request(app.getHttpServer())
      .get(`/chats/${chatId}`)
      .expect(200);

    expect(afterRes.body.messages).toHaveLength(originalMessages.length);
    const lastUserMsg = (afterRes.body.messages as { role: string; code?: string }[])
      .filter((m) => m.role === 'user')
      .at(-1);
    expect(lastUserMsg?.code).toBe(
      (originalMessages as { role: string; code?: string }[])
        .filter((m) => m.role === 'user')
        .at(-1)?.code,
    );
  });

  it('POST /chats/:id/messages with fromMessageId + __cannot__ returns 422 without truncating', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/chats')
      .send({ prompt: 'build a landing page' })
      .expect(201);

    const chatId: string = createRes.body.id as string;
    const firstUserMsgId: string = (createRes.body.messages as { role: string; id: string }[])
      .find((m) => m.role === 'user')!.id;

    await request(app.getHttpServer())
      .post(`/chats/${chatId}/messages`)
      .send({ content: 'make it dark' })
      .expect(201);

    const beforeTruncRes = await request(app.getHttpServer())
      .get(`/chats/${chatId}`)
      .expect(200);
    const messageCountBefore = (beforeTruncRes.body.messages as unknown[]).length;

    await request(app.getHttpServer())
      .post(`/chats/${chatId}/messages`)
      .send({ content: '__cannot__ this', fromMessageId: firstUserMsgId })
      .expect(422);

    const afterRes = await request(app.getHttpServer())
      .get(`/chats/${chatId}`)
      .expect(200);

    expect((afterRes.body.messages as unknown[]).length).toBe(messageCountBefore);
  });
});
