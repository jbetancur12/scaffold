module.exports = {
    root: true,
    env: { browser: true, es2020: true },
    extends: [require.resolve("@scaffold/config/eslint-preset")],
    ignorePatterns: ['dist', '.eslintrc.cjs'],
    plugins: ['react-refresh'],
    rules: {
        'react-refresh/only-export-components': 'off',
    },
}
