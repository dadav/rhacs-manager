"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginMainBody = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const login_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Login/login"));
const LoginMainBody = (_a) => {
    var { children = null, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(login_1.default.loginMainBody, className) }, props, { children: children })));
};
exports.LoginMainBody = LoginMainBody;
exports.LoginMainBody.displayName = 'LoginMainBody';
//# sourceMappingURL=LoginMainBody.js.map