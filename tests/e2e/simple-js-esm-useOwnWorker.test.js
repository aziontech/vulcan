import supertest from 'supertest';
import projectInitializer from '../utils/project-initializer';
import projectStop from '../utils/project-stop';
import { getContainerPort } from '../utils/docker-env-actions';

// timeout in minutes
const TIMEOUT = 1 * 60 * 3000;

let serverPort;
let localhostBaseUrl;
const EXAMPLE_PATH = '/examples/javascript/simple-js-esm-useOwnWorker';

describe('E2E - simple-js-esm-useOwnWorker project', () => {
  let request;

  beforeAll(async () => {
    serverPort = getContainerPort();
    localhostBaseUrl = `http://0.0.0.0:${serverPort}`;

    request = supertest(localhostBaseUrl);

    await projectInitializer(
      EXAMPLE_PATH,
      'javascript',
      'compute',
      serverPort,
      false,
    );
  }, TIMEOUT);

  afterAll(async () => {
    await projectStop(serverPort, EXAMPLE_PATH.replace('/examples/', ''));
  }, TIMEOUT);

  test('Should return a message in "/" route', async () => {
    const response = await request
      .get('/')
      .expect(200)
      .expect('x-custom-header', 'something defined on JS')
      .expect('Content-Type', /text\/plain/);

    expect(response.text).toBe('Hello world in a new response');
  });
});
