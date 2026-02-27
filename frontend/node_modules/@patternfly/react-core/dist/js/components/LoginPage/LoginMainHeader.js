"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginMainHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const Title_1 = require("../Title");
const react_styles_1 = require("@patternfly/react-styles");
const login_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Login/login"));
const LoginMainHeader = (_a) => {
    var { children = null, className = '', title = '', subtitle = '', headerUtilities = null } = _a, props = tslib_1.__rest(_a, ["children", "className", "title", "subtitle", "headerUtilities"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(login_1.default.loginMainHeader, className) }, props, { children: [title && ((0, jsx_runtime_1.jsx)(Title_1.Title, { headingLevel: "h2", size: Title_1.TitleSizes['3xl'], children: title })), subtitle && (0, jsx_runtime_1.jsx)("p", { className: (0, react_styles_1.css)(login_1.default.loginMainHeaderDesc), children: subtitle }), headerUtilities && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(login_1.default.loginMainHeaderUtilities), children: headerUtilities }), children] })));
};
exports.LoginMainHeader = LoginMainHeader;
exports.LoginMainHeader.displayName = 'LoginMainHeader';
//# sourceMappingURL=LoginMainHeader.js.map