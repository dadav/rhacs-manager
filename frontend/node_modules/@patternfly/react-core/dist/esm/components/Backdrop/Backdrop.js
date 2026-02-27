import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Backdrop/backdrop.mjs';
export const Backdrop = (_a) => {
    var { children = null, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({}, props, { className: css(styles.backdrop, className), children: children })));
};
Backdrop.displayName = 'Backdrop';
//# sourceMappingURL=Backdrop.js.map