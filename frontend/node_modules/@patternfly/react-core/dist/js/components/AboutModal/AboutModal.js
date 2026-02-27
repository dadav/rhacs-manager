"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutModal = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const c_about_modal_box_BackgroundImage_1 = tslib_1.__importDefault(require('@patternfly/react-tokens/dist/js/c_about_modal_box_BackgroundImage'));
const AboutModalBoxContent_1 = require("./AboutModalBoxContent");
const AboutModalBoxHeader_1 = require("./AboutModalBoxHeader");
const AboutModalBoxBrand_1 = require("./AboutModalBoxBrand");
const AboutModalBoxCloseButton_1 = require("./AboutModalBoxCloseButton");
const AboutModalBox_1 = require("./AboutModalBox");
const Modal_1 = require("../Modal");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const AboutModal = (_a) => {
    var { children, className, isOpen = false, onClose = (_e) => undefined, productName, trademark, backgroundImageSrc, brandImageSrc, brandImageAlt, hasNoContentContainer = false, appendTo, closeButtonAriaLabel, 'aria-label': ariaLabel, disableFocusTrap } = _a, props = tslib_1.__rest(_a, ["children", "className", "isOpen", "onClose", "productName", "trademark", "backgroundImageSrc", "brandImageSrc", "brandImageAlt", "hasNoContentContainer", "appendTo", "closeButtonAriaLabel", 'aria-label', "disableFocusTrap"]);
    if (brandImageSrc && !brandImageAlt) {
        // eslint-disable-next-line no-console
        console.error('AboutModal:', 'brandImageAlt is required when a brandImageSrc is specified, and should not be an empty string.');
    }
    if (!productName && !ariaLabel) {
        // eslint-disable-next-line no-console
        console.error('AboutModal:', 'Either productName or ariaLabel is required for component to be accessible');
    }
    if (!isOpen) {
        return null;
    }
    return ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { prefix: "pf-about-modal-title-", children: (ariaLabelledBy) => ((0, jsx_runtime_1.jsx)(Modal_1.Modal, Object.assign({ isOpen: isOpen, variant: Modal_1.ModalVariant.large }, (productName && { 'aria-labelledby': ariaLabelledBy }), { "aria-label": ariaLabel, onEscapePress: onClose, appendTo: appendTo, disableFocusTrap: disableFocusTrap, children: (0, jsx_runtime_1.jsxs)(AboutModalBox_1.AboutModalBox, { style: backgroundImageSrc
                    ? { [c_about_modal_box_BackgroundImage_1.default.name]: `url(${backgroundImageSrc})` }
                    : {}, className: (0, react_styles_1.css)(className), children: [(0, jsx_runtime_1.jsx)(AboutModalBoxBrand_1.AboutModalBoxBrand, { src: brandImageSrc, alt: brandImageAlt }), (0, jsx_runtime_1.jsx)(AboutModalBoxCloseButton_1.AboutModalBoxCloseButton, { "aria-label": closeButtonAriaLabel, onClose: onClose }), productName && (0, jsx_runtime_1.jsx)(AboutModalBoxHeader_1.AboutModalBoxHeader, { id: ariaLabelledBy, productName: productName }), (0, jsx_runtime_1.jsx)(AboutModalBoxContent_1.AboutModalBoxContent, Object.assign({ trademark: trademark, hasNoContentContainer: hasNoContentContainer }, props, { children: children }))] }) }))) }));
};
exports.AboutModal = AboutModal;
exports.AboutModal.displayName = 'AboutModal';
//# sourceMappingURL=AboutModal.js.map