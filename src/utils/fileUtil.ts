/*
 * @Author: jiangtao 1106950092@qq.com
 * @Date: 2024-07-26 09:51:44
 * @LastEditors: jiangtao 1106950092@qq.com
 * @LastEditTime: 2024-07-29 13:25:27
 * @FilePath: \echarts-legend-drage\src\utils\fileType.ts
 * @Description: 文件类型工具
 */

/**
 * @author jiangtao
 * @date 2024-07-26
 * @description 文件类型数组转换为input组件的accept属性值
 * @param fileTypes 文件类型数组 ['jpg', 'png', 'gif']
 * @returns  `.jpg,.jpeg,.bmp,.webp,.gif,.png`
 */
const fileTypesInputAcceptStr = (fileTypes: Array<string>): string => {
  const fileTypesArray = fileTypes.map(item => '.'  + item);
  return fileTypesArray.join(',');
}

/**
 * @author jiangtao
 * @date 2024-07-26
 * @description 文件类型数组转换为字符串，使用分隔符
 * @param fileTypes 文件类型数组 ['jpg', 'png', 'gif']
 * @param separator 分隔符
 * @returns 例如：`.jpg | .jpeg | .bmp | .webp | .gif | .png`
 */
const fileTypesSeparatorStr = (fileTypes: Array<string>, separator: string = ' | '): string => {
  const fileTypesArray = fileTypes.map(item => '.'  + item);
  return fileTypesArray.join(separator);
}

/**
 * @author jiangtao
 * @date 2024-07-26
 * @description 文件大小单位转换。
 * @description 1、若是小于1KB，则直接显示B，大于1KB小于1MB，则显示KB，大于1MB小于1GB，则显示MB，大于1GB，则显示GB。
 * @description 2、若小数点后两位小数末尾为0时，则去掉末尾的0。
 * @param size 文件大小，单位字节B
 * @returns  例如：1B、1KB、1MB、1GB
 */
const fileSizeToUnit = (size: number): string => {
  if (size < 1024) {
    return size + 'B';
  } else if (size < 1024 * 1024) {
    size = size / 1024;
    return Number.isInteger(size) ? size + 'KB' : size.toFixed(2).replace(/[0]$/g, '') + 'KB';
  } else if (size < 1024 * 1024 * 1024) {
    size = size / (1024 * 1024);
    return Number.isInteger(size) ? size + 'MB' : size.toFixed(2).replace(/[0]$/g, '') + 'MB';
  } else {
    size = size / (1024 * 1024 * 1024);
    return Number.isInteger(size) ? size + 'GB' : size.toFixed(2).replace(/[0]$/g, '') + 'GB';
  }
}

/**
 * @author jiangtao
 * @date 2024-07-26
 * @description 获取文件扩展名
 * @param fileName 文件名
 * @returns  例如：`jpg`
 */
const getFileExtension = (fileName: string): string => {
  const match = fileName.match(/\.(\w+)$/);
  // console.log(match);
  if (match) {
    return match[1];
  }
  return '';
}



export default { fileTypesInputAcceptStr, fileTypesSeparatorStr, fileSizeToUnit, getFileExtension }
