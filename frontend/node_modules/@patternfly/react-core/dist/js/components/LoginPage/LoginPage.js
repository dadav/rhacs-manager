"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const BackgroundImage_1 = require("../BackgroundImage");
const Brand_1 = require("../Brand");
const List_1 = require("../List");
const Login_1 = require("./Login");
const LoginHeader_1 = require("./LoginHeader");
const LoginFooter_1 = require("./LoginFooter");
const LoginMainHeader_1 = require("./LoginMainHeader");
const LoginMainBody_1 = require("./LoginMainBody");
const LoginMainFooter_1 = require("./LoginMainFooter");
const LoginPage = (_a) => {
    var { children = null, className = '', brandImgSrc = '', brandImgAlt = '', backgroundImgSrc = '', footerListItems = null, textContent = '', footerListVariants, loginTitle, loginSubtitle, headerUtilities, signUpForAccountMessage = null, forgotCredentials = null, socialMediaLoginContent = null, socialMediaLoginAriaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "brandImgSrc", "brandImgAlt", "backgroundImgSrc", "footerListItems", "textContent", "footerListVariants", "loginTitle", "loginSubtitle", "headerUtilities", "signUpForAccountMessage", "forgotCredentials", "socialMediaLoginContent", "socialMediaLoginAriaLabel"]);
    const HeaderBrand = ((0, jsx_runtime_1.jsx)(react_1.Fragment, { children: (0, jsx_runtime_1.jsx)(Brand_1.Brand, { src: brandImgSrc, alt: brandImgAlt }) }));
    const Header = (0, jsx_runtime_1.jsx)(LoginHeader_1.LoginHeader, { headerBrand: HeaderBrand });
    const Footer = ((0, jsx_runtime_1.jsxs)(LoginFooter_1.LoginFooter, { children: [(0, jsx_runtime_1.jsx)("p", { children: textContent }), (0, jsx_runtime_1.jsx)(List_1.List, { variant: footerListVariants, children: footerListItems })] }));
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [backgroundImgSrc && (0, jsx_runtime_1.jsx)(BackgroundImage_1.BackgroundImage, { src: backgroundImgSrc }), (0, jsx_runtime_1.jsxs)(Login_1.Login, Object.assign({ header: Header, footer: Footer, className: (0, react_styles_1.css)(className) }, props, { children: [(0, jsx_runtime_1.jsx)(LoginMainHeader_1.LoginMainHeader, { title: loginTitle, subtitle: loginSubtitle, headerUtilities: headerUtilities }), (0, jsx_runtime_1.jsx)(LoginMainBody_1.LoginMainBody, { children: children }), (socialMediaLoginContent || forgotCredentials || signUpForAccountMessage) && ((0, jsx_runtime_1.jsx)(LoginMainFooter_1.LoginMainFooter, { socialMediaLoginContent: socialMediaLoginContent, socialMediaLoginAriaLabel: socialMediaLoginAriaLabel, forgotCredentials: forgotCredentials, signUpForAccountMessage: signUpForAccountMessage }))] }))] }));
};
exports.LoginPage = LoginPage;
exports.LoginPage.displayName = 'LoginPage';
//# sourceMappingURL=LoginPage.js.map