import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload.mjs';
import { css } from '@patternfly/react-styles';
import { MultipleFileUploadTitleIcon } from './MultipleFileUploadTitleIcon';
import { MultipleFileUploadTitleText } from './MultipleFileUploadTitleText';
import { MultipleFileUploadTitleTextSeparator } from './MultipleFileUploadTitleTextSeparator';
export const MultipleFileUploadTitle = (_a) => {
    var { className, icon, text = '', textSeparator = '' } = _a, props = __rest(_a, ["className", "icon", "text", "textSeparator"]);
    return (_jsxs("div", Object.assign({ className: css(styles.multipleFileUploadTitle, className) }, props, { children: [icon && _jsx(MultipleFileUploadTitleIcon, { children: icon }), text && (_jsxs(MultipleFileUploadTitleText, { children: [`${text} `, textSeparator && _jsx(MultipleFileUploadTitleTextSeparator, { children: textSeparator })] }))] })));
};
MultipleFileUploadTitle.displayName = 'MultipleFileUploadTitle';
//# sourceMappingURL=MultipleFileUploadTitle.js.map