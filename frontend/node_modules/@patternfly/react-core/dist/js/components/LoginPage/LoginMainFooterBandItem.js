"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginMainFooterBandItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const login_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Login/login"));
const react_styles_1 = require("@patternfly/react-styles");
const LoginMainFooterBandItem = (_a) => {
    var { children = null, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("p", Object.assign({ className: (0, react_styles_1.css)(`${login_1.default.loginMainFooterBand}-item`, className) }, props, { children: children })));
};
exports.LoginMainFooterBandItem = LoginMainFooterBandItem;
exports.LoginMainFooterBandItem.displayName = 'LoginMainFooterBandItem';
//# sourceMappingURL=LoginMainFooterBandItem.js.map