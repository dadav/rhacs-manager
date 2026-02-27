import { __rest } from "tslib";
import { jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Login/login.mjs';
import { css } from '@patternfly/react-styles';
export const LoginHeader = (_a) => {
    var { className = '', children = null, headerBrand = null } = _a, props = __rest(_a, ["className", "children", "headerBrand"]);
    return (_jsxs("header", Object.assign({ className: css(styles.loginHeader, className) }, props, { children: [headerBrand, children] })));
};
LoginHeader.displayName = 'LoginHeader';
//# sourceMappingURL=LoginHeader.js.map