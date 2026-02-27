import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { css } from '@patternfly/react-styles';
import { BackgroundImage } from '../BackgroundImage';
import { Brand } from '../Brand';
import { List } from '../List';
import { Login } from './Login';
import { LoginHeader } from './LoginHeader';
import { LoginFooter } from './LoginFooter';
import { LoginMainHeader } from './LoginMainHeader';
import { LoginMainBody } from './LoginMainBody';
import { LoginMainFooter } from './LoginMainFooter';
export const LoginPage = (_a) => {
    var { children = null, className = '', brandImgSrc = '', brandImgAlt = '', backgroundImgSrc = '', footerListItems = null, textContent = '', footerListVariants, loginTitle, loginSubtitle, headerUtilities, signUpForAccountMessage = null, forgotCredentials = null, socialMediaLoginContent = null, socialMediaLoginAriaLabel } = _a, props = __rest(_a, ["children", "className", "brandImgSrc", "brandImgAlt", "backgroundImgSrc", "footerListItems", "textContent", "footerListVariants", "loginTitle", "loginSubtitle", "headerUtilities", "signUpForAccountMessage", "forgotCredentials", "socialMediaLoginContent", "socialMediaLoginAriaLabel"]);
    const HeaderBrand = (_jsx(Fragment, { children: _jsx(Brand, { src: brandImgSrc, alt: brandImgAlt }) }));
    const Header = _jsx(LoginHeader, { headerBrand: HeaderBrand });
    const Footer = (_jsxs(LoginFooter, { children: [_jsx("p", { children: textContent }), _jsx(List, { variant: footerListVariants, children: footerListItems })] }));
    return (_jsxs(Fragment, { children: [backgroundImgSrc && _jsx(BackgroundImage, { src: backgroundImgSrc }), _jsxs(Login, Object.assign({ header: Header, footer: Footer, className: css(className) }, props, { children: [_jsx(LoginMainHeader, { title: loginTitle, subtitle: loginSubtitle, headerUtilities: headerUtilities }), _jsx(LoginMainBody, { children: children }), (socialMediaLoginContent || forgotCredentials || signUpForAccountMessage) && (_jsx(LoginMainFooter, { socialMediaLoginContent: socialMediaLoginContent, socialMediaLoginAriaLabel: socialMediaLoginAriaLabel, forgotCredentials: forgotCredentials, signUpForAccountMessage: signUpForAccountMessage }))] }))] }));
};
LoginPage.displayName = 'LoginPage';
//# sourceMappingURL=LoginPage.js.map