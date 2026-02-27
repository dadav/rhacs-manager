import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
import { css } from '@patternfly/react-styles';
export const FormFieldGroupHeader = (_a) => {
    var { className, titleText, titleDescription, actions } = _a, props = __rest(_a, ["className", "titleText", "titleDescription", "actions"]);
    return (_jsxs("div", Object.assign({ className: css(styles.formFieldGroupHeader, className) }, props, { children: [_jsxs("div", { className: css(styles.formFieldGroupHeaderMain), children: [titleText && (_jsx("div", { className: css(styles.formFieldGroupHeaderTitle), children: _jsx("div", { className: css(styles.formFieldGroupHeaderTitleText), id: titleText.id, children: titleText.text }) })), titleDescription && _jsx("div", { className: css(styles.formFieldGroupHeaderDescription), children: titleDescription })] }), _jsx("div", { className: css(styles.formFieldGroupHeaderActions), children: actions && actions })] })));
};
FormFieldGroupHeader.displayName = 'FormFieldGroupHeader';
//# sourceMappingURL=FormFieldGroupHeader.js.map