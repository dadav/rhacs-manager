import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Login/login.mjs';
export const LoginMainFooter = (_a) => {
    var { children = null, socialMediaLoginContent = null, signUpForAccountMessage = null, forgotCredentials = null, className = '', socialMediaLoginAriaLabel } = _a, props = __rest(_a, ["children", "socialMediaLoginContent", "signUpForAccountMessage", "forgotCredentials", "className", "socialMediaLoginAriaLabel"]);
    return (_jsxs("div", Object.assign({ className: css(styles.loginMainFooter, className) }, props, { children: [children, socialMediaLoginContent && (_jsx("ul", { className: css(styles.loginMainFooterLinks), "aria-label": socialMediaLoginAriaLabel, role: "list", children: socialMediaLoginContent })), (signUpForAccountMessage || forgotCredentials) && (_jsxs("div", { className: css(styles.loginMainFooterBand), children: [signUpForAccountMessage, forgotCredentials] }))] })));
};
LoginMainFooter.displayName = 'LoginMainFooter';
//# sourceMappingURL=LoginMainFooter.js.map