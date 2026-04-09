/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  testEnvironment: 'node',

  setupFiles: [
    '@react-native-async-storage/async-storage/jest/async-storage-mock',
  ],

  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated)',
  ],

  moduleNameMapper: {
    // Stub out Expo's winter/import.meta runtime — not available in Node/Jest
    '^expo/src/winter/(.*)$': '<rootDir>/__mocks__/expo-runtime.js',
    '^expo/src/(.*)$':        '<rootDir>/__mocks__/expo-runtime.js',
  },

  collectCoverageFrom: [
    'services/Api.service.ts',
    'services/adminApi.ts',
  ],
};