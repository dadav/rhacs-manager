import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/FileUpload/file-upload.mjs';
import { css } from '@patternfly/react-styles';
export const FileUploadHelperText = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({ className: css(`${styles.fileUpload}__helper-text`, className) }, props, { children: children })));
};
FileUploadHelperText.displayName = 'FileUploadHelperText';
//# sourceMappingURL=FileUploadHelperText.js.map