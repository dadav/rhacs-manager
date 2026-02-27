"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultipleFileUploadStatusItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const multiple_file_upload_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/MultipleFileUpload/multiple-file-upload"));
const react_styles_1 = require("@patternfly/react-styles");
const Progress_1 = require("../Progress");
const Button_1 = require("../Button");
const file_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/file-icon'));
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const MultipleFileUploadStatusItem = (_a) => {
    var { className, file, fileIcon, onReadStarted = () => { }, onReadFinished = () => { }, onReadSuccess = () => { }, onReadFail = () => { }, onClearClick = () => { }, customFileHandler, fileName, fileSize, progressValue, progressVariant, progressAriaLabel, progressAriaLabelledBy, progressAriaDescribedBy, progressId, progressAriaLiveMessage, buttonAriaLabel = 'Remove from list', progressHelperText } = _a, props = tslib_1.__rest(_a, ["className", "file", "fileIcon", "onReadStarted", "onReadFinished", "onReadSuccess", "onReadFail", "onClearClick", "customFileHandler", "fileName", "fileSize", "progressValue", "progressVariant", "progressAriaLabel", "progressAriaLabelledBy", "progressAriaDescribedBy", "progressId", "progressAriaLiveMessage", "buttonAriaLabel", "progressHelperText"]);
    const [loadPercentage, setLoadPercentage] = (0, react_1.useState)(0);
    const [loadResult, setLoadResult] = (0, react_1.useState)();
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
    (0, react_1.useEffect)(() => {
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
    const title = ((0, jsx_runtime_1.jsxs)("span", { className: multiple_file_upload_1.default.multipleFileUploadStatusItemProgress, children: [(0, jsx_runtime_1.jsx)("span", { className: multiple_file_upload_1.default.multipleFileUploadStatusItemProgressText, children: fileName || (file === null || file === void 0 ? void 0 : file.name) || '' }), (0, jsx_runtime_1.jsx)("span", { className: multiple_file_upload_1.default.multipleFileUploadStatusItemProgressSize, children: fileSize || getHumanReadableFileSize((file === null || file === void 0 ? void 0 : file.size) || 0) })] }));
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ className: (0, react_styles_1.css)(multiple_file_upload_1.default.multipleFileUploadStatusItem, className) }, props, { children: [(0, jsx_runtime_1.jsx)("div", { className: multiple_file_upload_1.default.multipleFileUploadStatusItemIcon, children: fileIcon || (0, jsx_runtime_1.jsx)(file_icon_1.default, {}) }), (0, jsx_runtime_1.jsxs)("div", { className: multiple_file_upload_1.default.multipleFileUploadStatusItemMain, children: [(0, jsx_runtime_1.jsxs)("div", { className: "pf-v6-screen-reader", "aria-live": "polite", children: [progressAriaLiveMessage &&
                                typeof progressAriaLiveMessage === 'function' &&
                                progressAriaLiveMessage(+loadPercentage.toFixed(2)), progressAriaLiveMessage && typeof progressAriaLiveMessage === 'string' && progressAriaLiveMessage, !progressAriaLiveMessage && `Progress value is ${progressValue || Math.floor(loadPercentage)}%.`] }), (0, jsx_runtime_1.jsx)(Progress_1.Progress, { title: title, value: value, variant: variant, "aria-label": progressAriaLabel, "aria-labelledby": progressAriaLabelledBy, "aria-describedby": progressAriaDescribedBy, id: progressId, helperText: progressHelperText })] }), (0, jsx_runtime_1.jsx)("div", { className: `${multiple_file_upload_1.default.multipleFileUploadStatusItem}-close`, children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", "aria-label": buttonAriaLabel, onClick: onClearClick, icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }) })] })));
};
exports.MultipleFileUploadStatusItem = MultipleFileUploadStatusItem;
exports.MultipleFileUploadStatusItem.displayName = 'MultipleFileUploadStatusItem';
//# sourceMappingURL=MultipleFileUploadStatusItem.js.map