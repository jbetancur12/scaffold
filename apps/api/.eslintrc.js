module.exports = {
    extends: [require.resolve("@scaffold/config/eslint-preset")],
    env: {
        node: true,
        es2020: true,
    },
    rules: {
        "react/react-in-jsx-scope": "off",
        "react/display-name": "off",
        "react/prop-types": "off",
    },
};
