module.exports = function (api) {
  const isTest = api.env('test');
  api.cache.never();
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          reanimated: !isTest,
        },
      ],
    ],
  };
};