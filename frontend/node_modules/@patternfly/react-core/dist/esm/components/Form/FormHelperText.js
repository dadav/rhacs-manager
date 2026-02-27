import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Form/form.mjs';
export const FormHelperText = (_a) => {
    var { children = null, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({ className: css(styles.formHelperText, className) }, props, { children: children })));
};
FormHelperText.displayName = 'FormHelperText';
//# sourceMappingURL=FormHelperText.js.map