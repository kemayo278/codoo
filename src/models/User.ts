import {
  DataTypes,
  Model,
  Sequelize,
  BelongsToGetAssociationMixin,
} from 'sequelize';

export interface UserAttributes {
  id?: string;
  username: string;
  email: string;
  password_hash: string;
  isStaff?: boolean;
  role?: 'shop_owner' | 'manager' | 'seller' | 'admin';
  locationId?: string;
  shopId?: string;
  businessId?: string;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public isStaff?: boolean;
  public role?: 'shop_owner' | 'manager' | 'seller' | 'admin';
  public locationId?: string;
  public shopId?: string;
  public businessId?: string;

  // Relations (exemple de méthodes générées par Sequelize)
  public getShop!: BelongsToGetAssociationMixin<any>;
  public getBusiness!: BelongsToGetAssociationMixin<any>;
  public getLocation!: BelongsToGetAssociationMixin<any>;

  static initModel(sequelize: Sequelize): typeof User {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        username: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        isStaff: {
          type: DataTypes.BOOLEAN,
          allowNull: true,
          defaultValue: false,
          field: 'is_staff',
        },
        role: {
          type: DataTypes.ENUM('shop_owner', 'manager', 'seller', 'admin'),
          allowNull: true,
        },
        locationId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'location_id',
        },
        shopId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'shop_id',
        },
        businessId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'business_id',
        },
      },
      {
        sequelize,
        tableName: 'users',
        modelName: 'User',
        underscored: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Location, {
      foreignKey: 'location_id',
      as: 'location',
    });

    this.belongsTo(models.Shop, {
      foreignKey: 'shop_id',
      as: 'shop',
    });

    this.belongsTo(models.Business, {
      foreignKey: 'business_id',
      as: 'business',
    });
  }
}

export default User;
