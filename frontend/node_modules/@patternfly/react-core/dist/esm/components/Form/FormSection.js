import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
import { css } from '@patternfly/react-styles';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
export const FormSection = (_a) => {
    var { className = '', children, title = '', titleElement: TitleElement = 'div' } = _a, props = __rest(_a, ["className", "children", "title", "titleElement"]);
    return (_jsx(GenerateId, { prefix: "pf-form-section-title", children: (sectionId) => (_jsxs("section", Object.assign({ className: css(styles.formSection, className), role: "group" }, (title && { 'aria-labelledby': sectionId }), props, { children: [title && (_jsx(TitleElement, { id: sectionId, className: css(styles.formSectionTitle, className), children: title })), children] }))) }));
};
FormSection.displayName = 'FormSection';
//# sourceMappingURL=FormSection.js.map