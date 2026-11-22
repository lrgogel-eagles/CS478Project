const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/app');
let folder, app;
beforeEach(() => { folder = fs.mkdtempSync(path.join(os.tmpdir(), 'campaign-test-')); app = createApp({ dataFile: path.join(folder, 'data.json') }); });
afterEach(() => fs.rmSync(folder, { recursive: true, force: true }));
test('host, join, role permissions, persistence and private notes', async () => {
  const host = await request(app).post('/api/campaigns').send({ name:'Test Realm', host:'GM' });
  expect(host.status).toBe(201);
  const { id, code } = host.body.campaign;
  const gmToken = host.body.token;
  const player = await request(app).post('/api/campaigns/join').send({ code, name:'Player' });
  expect(player.status).toBe(201);
  const playerToken = player.body.token;
  expect((await request(app).patch(`/api/campaigns/${id}/status`).set('x-player-token',playerToken).send({ status:'active' })).status).toBe(403);
  expect((await request(app).patch(`/api/campaigns/${id}/status`).set('x-player-token',gmToken).send({ status:'active' })).status).toBe(409);
  expect((await request(app).patch(`/api/campaigns/${id}/ready`).set('x-player-token',playerToken).send({ ready:true })).body.members.find(m=>m.role==='player').ready).toBe(true);
  expect((await request(app).patch(`/api/campaigns/${id}/status`).set('x-player-token',gmToken).send({ status:'active' })).body.sessionNumber).toBe(1);
  expect((await request(app).post(`/api/campaigns/${id}/characters`).set('x-player-token',playerToken).send({ name:'Elara', className:'Ranger' })).status).toBe(201);
  expect((await request(app).post(`/api/campaigns/${id}/notes`).set('x-player-token',playerToken).send({ title:'Forbidden' })).status).toBe(403);
  await request(app).post(`/api/campaigns/${id}/notes`).set('x-player-token',gmToken).send({ title:'Secret', private:true });
  const gm = await request(app).get(`/api/campaigns/${id}`).set('x-player-token',gmToken);
  const playerView = await request(app).get(`/api/campaigns/${id}`).set('x-player-token',playerToken);
  expect(gm.body.notes).toHaveLength(1);
  expect(playerView.body.notes).toHaveLength(0);
  expect(playerView.body.characters[0].name).toBe('Elara');
  expect(JSON.parse(fs.readFileSync(path.join(folder,'data.json'))).campaigns).toHaveLength(1);
});

test('GM can remove player and player loses access', async () => {
  const host = await request(app).post('/api/campaigns').send({name:'Keep',host:'GM'});
  const id = host.body.campaign.id;
  const player = await request(app).post('/api/campaigns/join').send({code:host.body.campaign.code,name:'A'});
  const playerId = player.body.campaign.me.id;
  expect((await request(app).delete(`/api/campaigns/${id}/members/${playerId}`).set('x-player-token',player.body.token)).status).toBe(403);
  expect((await request(app).delete(`/api/campaigns/${id}/members/${playerId}`).set('x-player-token',host.body.token)).status).toBe(200);
  expect((await request(app).get(`/api/campaigns/${id}`).set('x-player-token',player.body.token)).status).toBe(401);
});

test('HP damage absorbs temporary HP, healing caps at max, dice and activity persist', async () => {
  const host = await request(app).post('/api/campaigns').send({name:'HP Test',host:'GM'});
  const id = host.body.campaign.id, token = host.body.token;
  const character = await request(app).post(`/api/campaigns/${id}/characters`).set('x-player-token',token).send({name:'Knight',maxHp:'20',currentHp:'18',tempHp:'5'});
  expect(character.status).toBe(201);
  const url = `/api/campaigns/${id}/characters/${character.body.id}/hp`;
  const damage = await request(app).post(url).set('x-player-token',token).send({action:'damage',amount:9});
  expect(damage.body.hp).toEqual({current:14,max:20,temp:0});
  const heal = await request(app).post(url).set('x-player-token',token).send({action:'heal',amount:50});
  expect(heal.body.hp.current).toBe(20);
  const dice = await request(app).post(`/api/campaigns/${id}/dice`).set('x-player-token',token).send({count:2,sides:6,bonus:3});
  expect(dice.status).toBe(200);
  expect(dice.body.rolls).toHaveLength(2);
  expect(dice.body.total).toBe(dice.body.rolls[0]+dice.body.rolls[1]+3);
  const reload = await request(createApp({dataFile:path.join(folder,'data.json')})).get(`/api/campaigns/${id}`).set('x-player-token',token);
  expect(reload.body.characters[0].currentHp).toBe(20);
  expect(reload.body.activity.some(x=>x.kind==='dice')).toBe(true);
});

test('portrait upload validates image and player cannot edit another character HP', async () => {
  const host = await request(app).post('/api/campaigns').send({name:'Portraits',host:'GM'});
  const id = host.body.campaign.id;
  const one = await request(app).post('/api/campaigns/join').send({code:host.body.campaign.code,name:'One'});
  const two = await request(app).post('/api/campaigns/join').send({code:host.body.campaign.code,name:'Two'});
  const char = await request(app).post(`/api/campaigns/${id}/characters`).set('x-player-token',one.body.token).send({name:'Mage'});
  expect((await request(app).post(`/api/campaigns/${id}/characters/${char.body.id}/hp`).set('x-player-token',two.body.token).send({action:'damage',amount:2})).status).toBe(403);
  const url = `/api/campaigns/${id}/characters/${char.body.id}/portrait`;
  expect((await request(app).post(url).set('x-player-token',one.body.token).set('Content-Type','image/png').send(Buffer.from('not an image'))).status).toBe(400);
  const png = Buffer.from('89504e470d0a1a0a0000000049454e44ae426082','hex');
  expect((await request(app).post(url).set('x-player-token',one.body.token).set('Content-Type','image/png').send(png)).status).toBe(200);
});

test('character import preserves portable fields but assigns new ownership and supports HP tracking', async () => {
  const host = await request(app).post('/api/campaigns').send({name:'Import test',host:'GM'});
  const player = await request(app).post('/api/campaigns/join').send({code:host.body.campaign.code,name:'Player'});
  const route = `/api/campaigns/${host.body.campaign.id}/characters/import`;
  const payload = {format:'campaign-keeper-character',version:1,character:{name:'Seraphina',className:'Ranger',maxHp:'44',currentHp:'37',tempHp:'6',strength:'12',ownerId:'spoofed',private:true}};
  const imported = await request(app).post(route).set('x-player-token',player.body.token).send(payload);
  expect(imported.status).toBe(201);
  expect(imported.body.ownerId).toBe(player.body.campaign.me.id);
  expect(imported.body.private).toBe(false);
  expect(imported.body.currentHp).toBe(37);
  expect(imported.body.className).toBe('Ranger');
  expect((await request(app).post(`/api/campaigns/${host.body.campaign.id}/characters/${imported.body.id}/hp`).set('x-player-token',player.body.token).send({action:'damage',amount:10})).body.hp).toEqual({current:33,max:44,temp:0});
  expect((await request(app).post(route).set('x-player-token',player.body.token).send({format:'wrong',version:1,character:{name:'Invalid'}})).status).toBe(400);
  expect((await request(app).post(route).set('x-player-token',player.body.token).send({...payload,character:{name:'',maxHp:'10'}})).status).toBe(400);
});


test('dice endpoint is handled before generic resource route and rejects invalid dice', async () => {
  const host = await request(app).post('/api/campaigns').send({name:'Dice route test',host:'GM'});
  const route = `/api/campaigns/${host.body.campaign.id}/dice`;
  const headers = req => req.set('x-player-token',host.body.token);
  const rolled = await headers(request(app).post(route)).send({count:3,sides:20,bonus:-2});
  expect(rolled.status).toBe(200);
  expect(rolled.body.rolls).toHaveLength(3);
  expect(rolled.body.rolls.every(n => n >= 1 && n <= 20)).toBe(true);
  expect(rolled.body.total).toBe(rolled.body.rolls.reduce((sum,n)=>sum+n,-2));
  const invalid = await headers(request(app).post(route)).send({count:0,sides:20,bonus:0});
  expect(invalid.status).toBe(400);
});
