import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ModalBox/modal-box.mjs';
export const ModalBoxHeader = (_a) => {
    var { children = null, className = '', help = null } = _a, props = __rest(_a, ["children", "className", "help"]);
    return (_jsxs("header", Object.assign({ className: css(styles.modalBoxHeader, help && styles.modifiers.help, className) }, props, { children: [help && (_jsxs(Fragment, { children: [_jsx("div", { className: css(styles.modalBoxHeaderMain), children: children }), _jsx("div", { className: `${styles.modalBoxHeader}-help`, children: help })] })), !help && children] })));
};
ModalBoxHeader.displayName = 'ModalBoxHeader';
//# sourceMappingURL=ModalBoxHeader.js.map