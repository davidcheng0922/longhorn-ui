import React from 'react'
import PropTypes from 'prop-types'
import { Form, Checkbox, Alert, Select } from 'antd'
import { ModalBlur } from '../../components'
import { getUIAttachedHosts, getUIAttachmentID } from './helper'

const FormItem = Form.Item
const formItemLayout = {
  labelCol: {
    span: 4,
  },
  wrapperCol: {
    span: 16,
  },
}

const formItemLayoutCheckBox = {
  labelCol: {
    span: 4,
  },
  wrapperCol: {
    span: 12,
  },
}

const modal = ({
  items,
  visible,
  onCancel,
  onOk,
  form: {
    getFieldDecorator,
    validateFields,
    getFieldsValue,
  },
}) => {
  const sharedBlockHosts = items?.length === 1 && items[0].sharedBlock ? getUIAttachedHosts(items[0]) : []

  function handleOk() {
    validateFields((errors) => {
      if (errors) {
        return
      }
      const data = {
        ...getFieldsValue(),
      }
      const params = items?.flatMap(item => {
        // Detach a shared block volume from the selected node only.
        if (sharedBlockHosts.length > 0) {
          return {
            url: item.actions?.detach,
            data: {
              forceDetach: data.forceDetach,
              attachmentID: getUIAttachmentID(true, data.host),
              hostId: data.host,
            },
          }
        }
        // Bulk detach a shared block volume from all nodes attached by the UI.
        if (item.sharedBlock) {
          return getUIAttachedHosts(item).map(host => ({
            url: item.actions?.detach,
            data: {
              forceDetach: data.forceDetach,
              attachmentID: getUIAttachmentID(true, host),
              hostId: host,
            },
          }))
        }
        return {
          url: item.actions?.detach,
          data: {
            forceDetach: data.forceDetach,
            attachmentID: 'longhorn-ui',
            hostId: '',
          },
        }
      })
      onOk(params)
    })
  }
  if (!items) {
    return null
  }
  const modalOpts = {
    title: `Are you sure you want to detach volume ${items.map((item) => `${item.name}`).join(', ')} ?`,
    visible,
    onCancel,
    width: 1040,
    onOk: handleOk,
  }

  const getAlertDescription = (item) => {
    const va = item?.volumeAttachment
    if (!va) return null

    const attachments = Object.values(va.attachments || {})

    if (attachments.some(att => att.attachmentType === 'csi-attacher' && att.satisfied)) {
      return (
        <div>
          Forcing this volume to detach could break its connection to Kubernetes&apos;s VolumeAttachment resources. This could prevent your applications from attaching volumes correctly, potentially causing Pods to fail or leading to data loss.
        </div>
      )
    }

    if (item?.kubernetesStatus?.workloadsStatus && !item.kubernetesStatus.lastPodRefAt) {
      return (
        <div>
          Detaching a Volume when it is being used by a running Kubernetes Pod will result in
          crashing of the Pod and possible loss of data. The Volume cannot be used by the
          Kubernetes again until the original Pod is deleted. Are you sure you want to detach the volume?
        </div>
      )
    }

    return null
  }

  return (
    <ModalBlur {...modalOpts}>
      <Form layout="horizontal" {...formItemLayout}>
        {sharedBlockHosts.length > 0 && (
          <FormItem label="Node" {...formItemLayout}>
            {getFieldDecorator('host', {
              initialValue: sharedBlockHosts[0],
              rules: [{ required: true, message: 'Please select the node to detach from' }],
            })(<Select>
              {sharedBlockHosts.map(host => <Select.Option key={host} value={host}>{host}</Select.Option>)}
            </Select>)}
          </FormItem>
        )}
        <FormItem label="Force Detach" valuepropname={'checked'} {...formItemLayoutCheckBox}>
          {getFieldDecorator('forceDetach', {
            initialValue: false,
            valuePropName: 'checked',
          })(<Checkbox></Checkbox>)}
        </FormItem>
        {items.some(item => getAlertDescription(item)) && (
          <Alert
            description={getAlertDescription(items.find(item => getAlertDescription(item)))}
            type="warning"
            showIcon
          />
        )}
      </Form>
    </ModalBlur>
  )
}

modal.propTypes = {
  form: PropTypes.object.isRequired,
  visible: PropTypes.bool,
  onCancel: PropTypes.func,
  items: PropTypes.array,
  onOk: PropTypes.func,
}

export default Form.create()(modal)
