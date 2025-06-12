import postcssImport from 'postcss-import';
import postcssFlexbugsFixes from 'postcss-flexbugs-fixes';
import postcssPresetEnv from 'postcss-preset-env';
import postcssPxtorem from 'postcss-pxtorem';

const config = {
  plugins: [
    postcssImport(),
    postcssFlexbugsFixes(),
    postcssPresetEnv({
      autoprefixer: {
        flexbox: 'no-2009',
      },
      stage: 3,
    }),
    postcssPxtorem({
      propList: ['*'],
    }),
  ],
};

export default config;
