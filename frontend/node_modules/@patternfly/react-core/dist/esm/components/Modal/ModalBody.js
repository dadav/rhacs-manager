import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ModalBox/modal-box.mjs';
export const ModalBody = (_a) => {
    var { children, className, 'aria-label': ariaLabel, role } = _a, props = __rest(_a, ["children", "className", 'aria-label', "role"]);
    const defaultModalBodyRole = ariaLabel ? 'region' : undefined;
    return (_jsx("div", Object.assign({ "aria-label": ariaLabel, role: role || defaultModalBodyRole, className: css(styles.modalBoxBody, className) }, props, { children: children })));
};
ModalBody.displayName = 'ModalBody';
//# sourceMappingURL=ModalBody.js.map