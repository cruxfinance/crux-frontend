import React, { memo, FC } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Feature, { IFeature } from "@components/Feature";

const MemoFeature = memo(Feature);

const FeatureList: FC<{ features: IFeature[]; }> = ({ features }) => {
  return (
    <>
      {features.map((item, i) => {
        const key = uuidv4();
        return (
          <MemoFeature
            title={item.title}
            content={item.content}
            image={item.image}
            imageAlt={item.imageAlt}
            index={i}
            key={key}
          />
        );
      })}
    </>
  );
}

const MemoizedFeatureList = memo(FeatureList);

export default MemoizedFeatureList;