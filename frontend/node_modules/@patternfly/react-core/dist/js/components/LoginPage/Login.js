"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const login_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Login/login"));
const react_styles_1 = require("@patternfly/react-styles");
const Login = (_a) => {
    var { className = '', children = null, footer = null, header = null } = _a, props = tslib_1.__rest(_a, ["className", "children", "footer", "header"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(login_1.default.login, className), children: (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(login_1.default.loginContainer), children: [header, (0, jsx_runtime_1.jsx)("main", { className: (0, react_styles_1.css)(login_1.default.loginMain), children: children }), footer] }) })));
};
exports.Login = Login;
exports.Login.displayName = 'Login';
//# sourceMappingURL=Login.js.map