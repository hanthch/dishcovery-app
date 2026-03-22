// __mocks__/axios.js
// Manual mock for axios — gives Jest a fully-controllable fake axios instance
// that Api.service.ts can call .create() on without hitting the network.

const mockAxiosInstance = {
  get:          jest.fn(),
  post:         jest.fn(),
  patch:        jest.fn(),
  put:          jest.fn(),
  delete:       jest.fn(),
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
};

const axios = {
  create:   jest.fn(() => mockAxiosInstance),
  get:      jest.fn(),
  post:     jest.fn(),
  patch:    jest.fn(),
  put:      jest.fn(),
  delete:   jest.fn(),
  defaults: { headers: { common: {} } },
  interceptors: {
    request:  { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
};

// Named export so `import axios from 'axios'` and `const axios = require('axios')` both work
axios.default = axios;
module.exports = axios;