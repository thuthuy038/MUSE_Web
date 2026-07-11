const User = require('../src/models/User')

exports.addAddress = async (req, res) => {

  try {

    const { userId } = req.params

    const {
      fullName,
      phone,
      province,
      district,
      ward,
      street,
      type,
      isDefault
    } = req.body


    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      })
    }


    // đảm bảo có mảng addresses
    if (!user.addresses) {
      user.addresses = []
    }


    // nếu địa chỉ mới là mặc định → reset cái cũ
    if (isDefault === true) {

      user.addresses.forEach(addr => {
        addr.isDefault = false
      })

    }


    const newAddress = {
      fullName,
      phone,
      province,
      district,
      ward,
      street,
      type,
      isDefault: isDefault || false
    }


    user.addresses.push(newAddress)

    await user.save()


    res.status(200).json({
      message: "Add address success",
      addresses: user.addresses
    })


  } catch (error) {

    console.error("Add address error:", error)

    res.status(500).json({
      message: "Server error",
      error: error.message
    })

  }

}