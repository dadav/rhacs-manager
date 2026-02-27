"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginMainFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const login_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Login/login"));
const LoginMainFooter = (_a) => {
    var { children = null, socialMediaLoginContent = null, signUpForAccountMessage = null, forgotCredentials = null, className = '', socialMediaLoginAriaLabel } = _a, props = tslib_1.__rest(_a, ["children", "socialMediaLoginContent", "signUpForAccountMessage", "forgotCredentials", "className", "socialMediaLoginAriaLabel"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(login_1.default.loginMainFooter, className) }, props, { children: [children, socialMediaLoginContent && ((0, jsx_runtime_1.jsx)("ul", { className: (0, react_styles_1.css)(login_1.default.loginMainFooterLinks), "aria-label": socialMediaLoginAriaLabel, role: "list", children: socialMediaLoginContent })), (signUpForAccountMessage || forgotCredentials) && ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(login_1.default.loginMainFooterBand), children: [signUpForAccountMessage, forgotCredentials] }))] })));
};
exports.LoginMainFooter = LoginMainFooter;
exports.LoginMainFooter.displayName = 'LoginMainFooter';
//# sourceMappingURL=LoginMainFooter.js.map