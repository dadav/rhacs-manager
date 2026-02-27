import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ModalBox/modal-box.mjs';
export const ModalBoxDescription = (_a) => {
    var { children = null, className = '', id = '' } = _a, props = __rest(_a, ["children", "className", "id"]);
    return (_jsx("div", Object.assign({}, props, { id: id, className: css(styles.modalBoxDescription, className), children: children })));
};
ModalBoxDescription.displayName = 'ModalBoxDescription';
//# sourceMappingURL=ModalBoxDescription.js.map