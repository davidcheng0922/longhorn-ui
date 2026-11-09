import React from 'react'
import PropTypes from 'prop-types'
import { Form, Select, Checkbox, Alert, Row, Col } from 'antd'
import { ModalBlur } from '../../components'

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
    span: 5,
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
  hosts,
  form: {
    getFieldDecorator,
    validateFields,
    getFieldsValue,
  },
}) => {
  function handleOk() {
    validateFields((errors) => {
      if (errors) {
        return
      }
      const data = {
        ...getFieldsValue(),
      }
      onOk(data.host, data.disableFrontend, items.map(item => item.actions.attach))
    })
  }

  const modalOpts = {
    title: 'Attach to host',
    visible,
    onCancel,
    width: 1040,
    onOk: handleOk,
  }

  // A shared block volume is attached to more nodes, so skip the nodes it is
  // already attached to.
  const attachedHosts = items?.[0]?.sharedBlock ? (items[0].frontendNodeIDs || []) : []
  const options = hosts.filter(host => host.conditions && host.conditions.Ready && host.conditions.Ready.status.toLowerCase() === 'true')
    .filter(host => !attachedHosts.includes(host.id))
    .map(host => <Select.Option key={host.name} value={host.id}>{host.name}</Select.Option>)
  if (!items || items.length === 0) {
    return null
  }

  // RWX volumes can only be manually attached in maintenance mode, except
  // shared block volumes, which serve the block device on every attached node.
  const hasRwxVolume = items && items.some((item) => {
    return item.accessMode === 'rwx' && !item.migratable && !item.sharedBlock
  })

  return (
    <ModalBlur {...modalOpts}>
      <Form layout="horizontal">
        <FormItem label="Host" hasFeedback {...formItemLayout}>
          {getFieldDecorator('host', {
            rules: [
              {
                required: true,
                message: 'Please select a host to attach',
              },
            ],
          })(<Select style={{ width: '100%' }} size="large">
            {options}
          </Select>)}
        </FormItem>
        <FormItem label="Maintenance" valuepropname={'checked'} {...formItemLayoutCheckBox}>
          {getFieldDecorator('disableFrontend', {
            initialValue: hasRwxVolume,
            valuePropName: 'checked',
            rules: [
              {
                required: false,
              },
            ],
          })(<Checkbox disabled={hasRwxVolume}></Checkbox>)}
        </FormItem>
      </Form>
      { hasRwxVolume ? <Row>
        <Col span={18} style={{ marginLeft: 100 }}>
          <Alert message="RWX volumes can only be manually attached in maintenance mode." type="warning" showIcon />
        </Col>
      </Row> : '' }
    </ModalBlur>
  )
}

modal.propTypes = {
  form: PropTypes.object.isRequired,
  visible: PropTypes.bool,
  onCancel: PropTypes.func,
  items: PropTypes.array,
  onOk: PropTypes.func,
  hosts: PropTypes.array,
}

export default Form.create()(modal)
