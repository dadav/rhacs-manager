import { __rest } from "tslib";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ModalBox/modal-box.mjs';
import { ModalBoxDescription } from './ModalBoxDescription';
import { ModalBoxTitle } from './ModalBoxTitle';
export const ModalHeader = (_a) => {
    var { children, className, descriptorId, description, labelId, title, titleIconVariant, titleScreenReaderText, help } = _a, props = __rest(_a, ["children", "className", "descriptorId", "description", "labelId", "title", "titleIconVariant", "titleScreenReaderText", "help"]);
    const headerContent = children ? (children) : (_jsxs(_Fragment, { children: [_jsx(ModalBoxTitle, { title: title, titleIconVariant: titleIconVariant, titleScreenReaderText: titleScreenReaderText, id: labelId }), description && _jsx(ModalBoxDescription, { id: descriptorId, children: description })] }));
    return (_jsxs("header", Object.assign({ className: css(styles.modalBoxHeader, help && styles.modifiers.help, className) }, props, { children: [help && (_jsxs(_Fragment, { children: [_jsx("div", { className: css(styles.modalBoxHeaderMain), children: headerContent }), _jsx("div", { className: `${styles.modalBoxHeader}-help`, children: help })] })), !help && headerContent] })));
};
ModalHeader.displayName = 'ModalHeader';
//# sourceMappingURL=ModalHeader.js.map