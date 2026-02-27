import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Login/login.mjs';
import { css } from '@patternfly/react-styles';
export const Login = (_a) => {
    var { className = '', children = null, footer = null, header = null } = _a, props = __rest(_a, ["className", "children", "footer", "header"]);
    return (_jsx("div", Object.assign({}, props, { className: css(styles.login, className), children: _jsxs("div", { className: css(styles.loginContainer), children: [header, _jsx("main", { className: css(styles.loginMain), children: children }), footer] }) })));
};
Login.displayName = 'Login';
//# sourceMappingURL=Login.js.map