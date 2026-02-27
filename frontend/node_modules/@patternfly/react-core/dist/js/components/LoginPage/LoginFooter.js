"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const login_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Login/login"));
const react_styles_1 = require("@patternfly/react-styles");
const LoginFooter = (_a) => {
    var { className = '', children = null } = _a, props = tslib_1.__rest(_a, ["className", "children"]);
    return ((0, jsx_runtime_1.jsx)("footer", Object.assign({ className: (0, react_styles_1.css)(login_1.default.loginFooter, className) }, props, { children: children })));
};
exports.LoginFooter = LoginFooter;
exports.LoginFooter.displayName = 'LoginFooter';
//# sourceMappingURL=LoginFooter.js.map