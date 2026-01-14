import { test, expect } from '@playwright/test';

const base64Encode = (utf8String: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(utf8String)));

test('empty query', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByRole('table')).toContainText('256'); // Patients
  await expect(page.getByRole('table')).toContainText('2593'); // Specimens
});

test('gender: male', async ({ page }) => {
  let query = [[{ "id": "d35d3138-d438-468c-8db3-9871172a7d1a", "key": "gender", "name": "Gender", "type": "EQUALS", "values": [{ "name": "male", "value": "male", "queryBindId": "e97389c7-b5ba-43a8-804a-38c426df9a39" }] }]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('120'); // Patients
  await expect(page.getByRole('table')).toContainText('1226'); // Specimens
});

test('diagnosis: C50.%', async ({ page }) => {
  let query = [[{ "id": "c350b3b2-e220-44a1-ade2-cd79ee4a05ce", "name": "Diagnosis ICD-10", "key": "diagnosis", "type": "EQUALS", "values": [{ "value": "C50.%", "name": "C50.%", "description": "Malignant neoplasm of breast", "queryBindId": "f79bdbeb-1b02-4733-b1d4-ea939570790d" }] }]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('2'); // Patients
  await expect(page.getByRole('table')).toContainText('20'); // Specimens
});

test('diagnosis age donor: <=30', async ({ page }) => {
  let query = [[{"id":"6d20cd49-a663-4f8e-97ee-1dcb395aa5c6","key":"diagnosis_age_donor","name":"Diagnosis age donor (years)","type":"BETWEEN","values":[{"name":"≤ 30","value":{"max":30},"queryBindId":"043895db-d810-4f6d-92dd-4943f37da86f"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('120'); // Patients
  await expect(page.getByRole('table')).toContainText('1195'); // Specimens
});

test('diagnosis age donor: 30-50', async ({ page }) => {
  let query = [[{"id":"7a43c6bd-53a9-4325-8faf-284b5ac922ed","key":"diagnosis_age_donor","name":"Diagnosis age donor (years)","type":"BETWEEN","values":[{"name":"30 - 50","value":{"min":30,"max":50},"queryBindId":"1e20538b-179a-46c7-ad94-3409a285663e"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('94'); // Patients
  await expect(page.getByRole('table')).toContainText('975'); // Specimens
});

test('diagnosis age donor: >=50', async ({ page }) => {
  let query = [[{ "id": "5f32bbd9-a614-4b68-bb5a-e0a01899da13", "key": "diagnosis_age_donor", "name": "Diagnosis age donor (years)", "type": "BETWEEN", "values": [{ "name": "≥ 50", "value": { "min": 50 }, "queryBindId": "4ad25b2b-1bfd-4354-b4de-d4ab83b0803b" }] }]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('50'); // Patients
  await expect(page.getByRole('table')).toContainText('499'); // Specimens
});

test('diagnosis age donor: <= 2010-01-01', async ({ page }) => {
  let query = [[{"id":"4092fac3-f07c-40fa-abcd-62f30066f4fb","key":"date_of_diagnosis","name":"Date of diagnosis","type":"BETWEEN","values":[{"name":"≤ 2010-01-01","value":{"max":"2010-01-01"},"queryBindId":"de26c783-f976-440a-a46a-c57387a60dde"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('147'); // Patients
  await expect(page.getByRole('table')).toContainText('1490'); // Specimens
});

test('diagnosis age donor: 2010-01-01 - 2015-01-01', async ({ page }) => {
  let query = [[{"id":"cd7e4a40-ce96-49cc-9f4a-1ed36b8bc3f3","key":"date_of_diagnosis","name":"Date of diagnosis","type":"BETWEEN","values":[{"name":"2010-01-01 - 2015-01-01","value":{"min":"2010-01-01","max":"2015-01-01"},"queryBindId":"215de4e1-c5cd-42b4-b694-f86fe9f5d16a"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('75'); // Patients
  await expect(page.getByRole('table')).toContainText('757'); // Specimens
});

test('diagnosis age donor: >= 2015-01-01', async ({ page }) => {
  let query = [[{"id":"38343b0b-bdb4-4153-bfaa-37446c6afbe9","key":"date_of_diagnosis","name":"Date of diagnosis","type":"BETWEEN","values":[{"name":"≥ 2015-01-01","value":{"min":"2015-01-01"},"queryBindId":"64a66cbe-3134-4db7-a4f9-95096ee84886"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('33'); // Patients
  await expect(page.getByRole('table')).toContainText('336'); // Specimens
});

test('donor age: <=30', async ({ page }) => {
  let query = [[{"id":"ac39d619-9117-4491-9544-e1f1872ef769","key":"donor_age","name":"Donor Age","type":"BETWEEN","values":[{"name":"≤ 30","value":{"max":30},"queryBindId":"27821a2d-29b0-4c68-ad60-b7993cc57c1a"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('28'); // Patients
  await expect(page.getByRole('table')).toContainText('259'); // Specimens
});

test('donor age: 30-50', async ({ page }) => {
  let query = [[{"id":"a82e1b88-4587-485d-9880-eb7d6bb63b09","key":"donor_age","name":"Donor Age","type":"BETWEEN","values":[{"name":"30 - 50","value":{"min":30,"max":50},"queryBindId":"f355c3bf-9a69-4576-b511-92b6ef58139a"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('98'); // Patients
  await expect(page.getByRole('table')).toContainText('982'); // Specimens
});

test('donor age: >=50', async ({ page }) => {
  let query = [[{"id":"d2188bd4-0e99-4bb4-865d-b998503c9e18","key":"donor_age","name":"Donor Age","type":"BETWEEN","values":[{"name":"≥ 50","value":{"min":50},"queryBindId":"2f0f47f0-7cc2-4a1f-a94d-73bbd0f6cf73"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('137'); // Patients
  await expect(page.getByRole('table')).toContainText('1425'); // Specimens
});

test('sample type: serum', async ({ page }) => {
  let query = [[{"id":"29d9c87f-7a81-4bdb-aa1b-3f5a272dfd86","key":"sample_kind","name":"Sample type","type":"EQUALS","values":[{"name":"Serum","value":"blood-serum","queryBindId":"75c04077-0312-4fd2-a74f-bf3766f7459c"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('84'); // Patients
  await expect(page.getByRole('table')).toContainText('101'); // Specimens
});

test('sampling date: <= 2010-01-01', async ({ page }) => {
  let query = [[{"id":"0cf181f4-4100-46a3-8e8b-639a259ee525","key":"sampling_date","name":"Sampling date","type":"BETWEEN","values":[{"name":"≤ 2010-01-01","value":{"max":"2010-01-01"},"queryBindId":"4ab86b14-7991-47b5-8016-423c5a470438"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('148'); // Patients
  await expect(page.getByRole('table')).toContainText('1500'); // Specimens
});

test('sampling date: 2010-01-01 - 2015-01-01', async ({ page }) => {
  let query = [[{"id":"398c3c7c-4855-4dea-a157-be423e50e341","key":"sampling_date","name":"Sampling date","type":"BETWEEN","values":[{"name":"2010-01-01 - 2015-01-01","value":{"min":"2010-01-01","max":"2015-01-01"},"queryBindId":"b4b2e1cd-a218-486d-86e0-c0e74daaee63"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('75'); // Patients
  await expect(page.getByRole('table')).toContainText('757'); // Specimens
});

test('sampling date: >= 2015-01-01', async ({ page }) => {
  let query = [[{"id":"54bf0999-a347-403f-886b-0b574bad958e","key":"sampling_date","name":"Sampling date","type":"BETWEEN","values":[{"name":"≥ 2015-01-01","value":{"min":"2015-01-01"},"queryBindId":"5c52c64c-b2f2-45eb-a331-95dd2af2c3aa"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('33'); // Patients
  await expect(page.getByRole('table')).toContainText('336'); // Specimens
});

test('storage temperature: liquid nitrogen', async ({ page }) => {
  let query = [[{"id":"8e1e9eea-fd87-4f0e-b19c-59d0842e0e0f","key":"storage_temperature","name":"Storage temperature","type":"EQUALS","values":[{"name":"Liquid nitrogen","value":"temperatureLN","queryBindId":"ac703f7d-3929-429a-a5dc-f9840f678bfc"}]}]];
  await page.goto('/search?query=' + base64Encode(JSON.stringify(query)));
  await expect(page.getByRole('table')).toContainText('181'); // Patients
  await expect(page.getByRole('table')).toContainText('333'); // Specimens
});
