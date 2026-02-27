import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import styles from '@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload.mjs';
import { css } from '@patternfly/react-styles';
import { Progress } from '../Progress';
import { Button } from '../Button';
import FileIcon from '@patternfly/react-icons/dist/esm/icons/file-icon';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
export const MultipleFileUploadStatusItem = (_a) => {
    var { className, file, fileIcon, onReadStarted = () => { }, onReadFinished = () => { }, onReadSuccess = () => { }, onReadFail = () => { }, onClearClick = () => { }, customFileHandler, fileName, fileSize, progressValue, progressVariant, progressAriaLabel, progressAriaLabelledBy, progressAriaDescribedBy, progressId, progressAriaLiveMessage, buttonAriaLabel = 'Remove from list', progressHelperText } = _a, props = __rest(_a, ["className", "file", "fileIcon", "onReadStarted", "onReadFinished", "onReadSuccess", "onReadFail", "onClearClick", "customFileHandler", "fileName", "fileSize", "progressValue", "progressVariant", "progressAriaLabel", "progressAriaLabelledBy", "progressAriaDescribedBy", "progressId", "progressAriaLiveMessage", "buttonAriaLabel", "progressHelperText"]);
    const [loadPercentage, setLoadPercentage] = useState(0);
    const [loadResult, setLoadResult] = useState();
    function readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.onprogress = (data) => {
                if (data.lengthComputable) {
                    setLoadPercentage((data.loaded / data.total) * 100);
                }
            };
            reader.readAsDataURL(file);
        });
    }
    useEffect(() => {
        if (customFileHandler) {
            customFileHandler(file);
        }
        else {
            onReadStarted(file);
            readFile(file)
                .then((data) => {
                setLoadResult('success');
                setLoadPercentage(100);
                onReadFinished(file);
                onReadSuccess(data, file);
            })
                .catch((error) => {
                onReadFinished(file);
                onReadFail(error, file);
                setLoadResult('danger');
            });
        }
    }, []);
    const getHumanReadableFileSize = (size) => {
        const prefixes = ['', 'K', 'M', 'G', 'T'];
        let prefixUnit = 0;
        while (size >= 1000) {
            prefixUnit += 1;
            size = size / 1000;
        }
        if (prefixUnit >= prefixes.length) {
            return 'File size too large';
        }
        return `${Math.round(size)}${prefixes[prefixUnit]}B`;
    };
    const value = progressValue || loadPercentage;
    const variant = progressVariant || loadResult;
    const title = (_jsxs("span", { className: styles.multipleFileUploadStatusItemProgress, children: [_jsx("span", { className: styles.multipleFileUploadStatusItemProgressText, children: fileName || (file === null || file === void 0 ? void 0 : file.name) || '' }), _jsx("span", { className: styles.multipleFileUploadStatusItemProgressSize, children: fileSize || getHumanReadableFileSize((file === null || file === void 0 ? void 0 : file.size) || 0) })] }));
    return (_jsxs("li", Object.assign({ className: css(styles.multipleFileUploadStatusItem, className) }, props, { children: [_jsx("div", { className: styles.multipleFileUploadStatusItemIcon, children: fileIcon || _jsx(FileIcon, {}) }), _jsxs("div", { className: styles.multipleFileUploadStatusItemMain, children: [_jsxs("div", { className: "pf-v6-screen-reader", "aria-live": "polite", children: [progressAriaLiveMessage &&
                                typeof progressAriaLiveMessage === 'function' &&
                                progressAriaLiveMessage(+loadPercentage.toFixed(2)), progressAriaLiveMessage && typeof progressAriaLiveMessage === 'string' && progressAriaLiveMessage, !progressAriaLiveMessage && `Progress value is ${progressValue || Math.floor(loadPercentage)}%.`] }), _jsx(Progress, { title: title, value: value, variant: variant, "aria-label": progressAriaLabel, "aria-labelledby": progressAriaLabelledBy, "aria-describedby": progressAriaDescribedBy, id: progressId, helperText: progressHelperText })] }), _jsx("div", { className: `${styles.multipleFileUploadStatusItem}-close`, children: _jsx(Button, { variant: "plain", "aria-label": buttonAriaLabel, onClick: onClearClick, icon: _jsx(TimesIcon, {}) }) })] })));
};
MultipleFileUploadStatusItem.displayName = 'MultipleFileUploadStatusItem';
//# sourceMappingURL=MultipleFileUploadStatusItem.js.map