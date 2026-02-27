import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Title, TitleSizes } from '../Title';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Login/login.mjs';
export const LoginMainHeader = (_a) => {
    var { children = null, className = '', title = '', subtitle = '', headerUtilities = null } = _a, props = __rest(_a, ["children", "className", "title", "subtitle", "headerUtilities"]);
    return (_jsxs("div", Object.assign({ className: css(styles.loginMainHeader, className) }, props, { children: [title && (_jsx(Title, { headingLevel: "h2", size: TitleSizes['3xl'], children: title })), subtitle && _jsx("p", { className: css(styles.loginMainHeaderDesc), children: subtitle }), headerUtilities && _jsx("div", { className: css(styles.loginMainHeaderUtilities), children: headerUtilities }), children] })));
};
LoginMainHeader.displayName = 'LoginMainHeader';
//# sourceMappingURL=LoginMainHeader.js.map