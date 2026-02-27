import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload.mjs';
import { css } from '@patternfly/react-styles';
import { MultipleFileUploadTitle } from './MultipleFileUploadTitle';
import { MultipleFileUploadButton } from './MultipleFileUploadButton';
import { MultipleFileUploadInfo } from './MultipleFileUploadInfo';
export const MultipleFileUploadMain = (_a) => {
    var { className, titleIcon, titleText, titleTextSeparator, infoText, isUploadButtonHidden, browseButtonText = 'Upload' } = _a, props = __rest(_a, ["className", "titleIcon", "titleText", "titleTextSeparator", "infoText", "isUploadButtonHidden", "browseButtonText"]);
    const showTitle = !!titleIcon || !!titleText || !!titleTextSeparator;
    return (_jsxs("div", Object.assign({ className: css(styles.multipleFileUploadMain, className) }, props, { children: [showTitle && _jsx(MultipleFileUploadTitle, { icon: titleIcon, text: titleText, textSeparator: titleTextSeparator }), isUploadButtonHidden || _jsx(MultipleFileUploadButton, { browseButtonText: browseButtonText }), !!infoText && _jsx(MultipleFileUploadInfo, { children: infoText })] })));
};
MultipleFileUploadMain.displayName = 'MultipleFileUploadMain';
//# sourceMappingURL=MultipleFileUploadMain.js.map